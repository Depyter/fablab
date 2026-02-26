import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";

export const getProjects = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!userProfile) throw new Error("User not authorized");

    const baseQuery = ctx.db.query("projects");

    const isPrivileged =
      userProfile.role === "admin" || userProfile.role === "maker";

    const scopedQuery = isPrivileged
      ? baseQuery
      : baseQuery.withIndex("by_userProfile", (q) =>
          q.eq("userId", userProfile._id),
        );

    return scopedQuery.order("desc").paginate(args.paginationOpts);
  },
});
