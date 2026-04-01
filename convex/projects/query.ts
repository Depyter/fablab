import { paginationOptsValidator } from "convex/server";
import { authQuery } from "../helper";

export const getProjects = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
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

    const result = await scopedQuery
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page.map(async (project) => {
        const clientProfile = await ctx.db.get(project.userId);
        const service = await ctx.db.get(project.service);

        // Find resource usage for date/time
        const usage = await ctx.db
          .query("resourceUsage")
          .filter((q) => q.eq(q.field("project"), project._id))
          .first();

        return {
          ...project,
          clientName: clientProfile?.name ?? "Unknown Client",
          serviceName: service?.name ?? "Unknown Service",
          bookingDate: usage?.date ?? Date.now(),
          bookingTime: usage?.startTime ?? Date.now(),
          estimatedPrice: 0, // Fallback price calculation
        };
      }),
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});
