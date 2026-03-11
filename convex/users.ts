import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const getRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
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
