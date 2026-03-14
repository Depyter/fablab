import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { checkAuthority } from "../helper";

export const getBookings = mutation({
  args: {
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new Error("Unauthorized. Cannot see machine usage.");

    const machineUsages = await ctx.db
      .query("resourceUsage")
      .withIndex("by_date_resource_startTime", (q) => q.eq("date", args.date))
      .collect();

    return await Promise.all(
      machineUsages.map(async (usage) => {
        const [project, maker, resource] = await Promise.all([
          ctx.db.get(usage.project),
          ctx.db.get(usage.maker),
          ctx.db.get(usage.resource),
        ]);
        return { ...usage, project, maker, resource };
      }),
    );
  },
});
