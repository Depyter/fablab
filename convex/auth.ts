import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";
import { AuthFunctions } from "@convex-dev/better-auth";
import { internal } from "./_generated/api";
import { query } from "./_generated/server";

const siteUrl = process.env.SITE_URL!;
const authfunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
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
});

export const { onCreate } = authComponent.triggersApi();

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    socialProviders: {
      // github: {
      //   clientId: process.env.GITHUB_CLIENT_ID as string,
      //   clientSecret: process.env.GITHUB_CLIENT_KEY as string,
      // },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return ctx.auth.getUserIdentity();
  },
});
