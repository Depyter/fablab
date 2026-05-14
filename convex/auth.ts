import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { betterAuth, BetterAuthOptions } from "better-auth/minimal";
import authConfig from "./auth.config";
import { AuthFunctions } from "@convex-dev/better-auth";
import { internal } from "./_generated/api";
import { authQuery } from "./helper";
import authSchema from "./betterAuth/schema";
import { admin, oAuthProxy } from "better-auth/plugins";

const authfunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
    authFunctions: authfunctions,
    triggers: {
      user: {
        onCreate: async (ctx, user) => {
          // Sync the Convex userProfile to match the role that Better Auth
          // assigned during creation (set by databaseHooks.user.create.before).
          if (user.role === "admin") {
            await ctx.runMutation(internal.users.createAdmin, {
              userId: user._id,
              name: user.name,
              email: user.email,
            });
          } else {
            await ctx.runMutation(internal.users.createUserProfile, {
              userId: user._id,
              name: user.name,
              email: user.email,
            });
          }
        },
      },
    },
  },
);

/** Returns `true` when email/password auth should be available.
 * We use an explicit allow-list to remain safe by default: if
 * NEXTJS_ENV is unset (production), this returns `false`.
 *
 * - `development` — set by `.dev.vars` for local dev
 * - `preview`      — set by the CI preview workflow via `bunx convex env set`
 */
function isPreviewEnvironment(): boolean {
  const env = process.env.NEXTJS_ENV;
  return env === "preview" || env === "development";
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "";
  const trustedOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const currentSiteUrl = process.env.CURRENT_SITE_URL;
  if (currentSiteUrl && !trustedOrigins.includes(currentSiteUrl)) {
    trustedOrigins.push(currentSiteUrl);
  }

  const isPreview = isPreviewEnvironment();

  return {
    secret: process.env.BETTER_AUTH_SECRET as string,
    rateLimit: {
      enabled: true,
      customRules: {
        ...(isPreview
          ? {
              "/sign-in/email": { window: 60, max: 5 },
              "/sign-up/email": { window: 60, max: 3 },
            }
          : {
              "/sign-in/social": { window: 60, max: 10 },
            }),
        "/callback/*": { window: 60, max: 10 },
      },
    },
    trustedOrigins,
    onAPIError: {
      errorURL: "/error",
    },
    advanced: {
      trustedProxyHeaders: true,
    },
    database: authComponent.adapter(ctx),

    // Email/password auth is only enabled in preview environments.
    // In production we rely on OAuth (Google), keeping the surface area small.
    emailAndPassword: {
      enabled: isPreview,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
    },

    // Social providers are disabled in preview because OAuth redirect URIs
    // cannot be registered for ephemeral preview deployment URLs.
    socialProviders: isPreview
      ? {}
      : {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        },

    plugins: [
      // The oAuthProxy plugin is only needed when social OAuth is active.
      // In preview, including it would produce warnings since the necessary
      // env vars (BETTER_AUTH_URL) may not be set.
      ...(isPreview
        ? []
        : [
            oAuthProxy({
              productionURL: betterAuthUrl,
              currentURL: process.env.CURRENT_SITE_URL,
            }),
          ]),
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
      admin(),
    ],

    // Database hooks run before/after Better Auth database operations.
    // The `user.create.before` hook intercepts user creation and assigns
    // the admin role to the very first user in the deployment.
    // The trigger above then reads this role to create the matching Convex
    // userProfile.
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            const userCount =
              await context!.context.internalAdapter.countTotalUsers();

            if (userCount === 0) {
              return {
                data: {
                  ...user,
                  role: "admin",
                },
              };
            }

            return { data: user };
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
};

export const { onCreate } = authComponent.triggersApi();

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};

export const { getAuthUser } = authComponent.clientApi();

export const getCurrentUser = authQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.auth.getUserIdentity();
  },
});
