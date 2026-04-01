import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authQuery } from "./helper";

export const getUserProfile = authQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();
  },
});

export const getRole = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!profile) throw new Error("User profile not found");

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
