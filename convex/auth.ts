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
          // Create user Profile
          await ctx.runMutation(internal.users.createUserProfile, {
            userId: user._id,
            name: user.name,
            email: user.email,
          });
        },
      },
    },
  },
);

/** Returns `true` in any non-production environment (preview CI deploys
 * or local development). This gates email/password auth which should
 * never be available on the production domain.
 *
 * The `.dev.vars` file sets `NEXTJS_ENV=development` for local dev,
 * while the CI preview workflow sets it to `preview`.
 * Production does not set this var, so the default fallback is `false`.
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
