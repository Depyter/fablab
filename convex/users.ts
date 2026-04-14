import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  authQuery,
  authMutation,
  claimFiles,
  ensureAuthentication,
  publicMutation,
} from "./helper";
import { Id } from "./_generated/dataModel";

export const getUserProfile = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!profile) return null;

    return {
      ...profile,
      profilePicUrl: profile.profilePic
        ? await ctx.storage.getUrl(profile.profilePic)
        : null,
    };
  },
});

export const updateProfile = authMutation({
  args: {
    name: v.optional(v.string()),
    profilePic: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const updates: { name?: string; profilePic?: Id<"_storage"> } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.profilePic !== undefined) {
      updates.profilePic = args.profilePic;
      await claimFiles(ctx, [args.profilePic]);
    }

    await ctx.db.patch(ctx.profile._id, updates);
  },
});

export const getRole = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!profile) throw new ConvexError("User profile not found");

    return profile.role;
  },
});

export const createUserProfile = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userProfile", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      role: "client",
    });
  },
});

export const createAdmin = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userProfile", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      role: "admin",
    });
  },
});

export const getMakers = authQuery({
  args: {},
  handler: async (ctx) => {
    const makers = await ctx.db
      .query("userProfile")
      .withIndex("by_role", (q) => q.eq("role", "maker"))
      .collect();

    return Promise.all(
      makers.map(async (maker) => ({
        ...maker,
        profilePicUrl: maker.profilePic
          ? await ctx.storage.getUrl(maker.profilePic)
          : null,
      })),
    );
  },
});
