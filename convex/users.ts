import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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
