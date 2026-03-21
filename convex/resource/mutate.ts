import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkAuthority } from "../helper";

export const addMachine = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    service: v.id("services"),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization) throw new Error("Unauthorized. Cannot add machine.");

    await ctx.db.insert("resources", {
      name: args.name,
      description: args.description,
      service: args.service,
      status: args.status,
    });
  },
});

export const addUsage = mutation({
  args: {
    machine: v.id("resources"),
    project: v.id("projects"),
    startTime: v.number(),
    endTime: v.number(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization) throw new Error("Unauthorized. Cannot update usage.");

    const resourceUsage = await ctx.db
      .query("resourceUsage")
      .withIndex("by_date_resource_startTime", (q) =>
        q
          .eq("date", args.date)
          .eq("resource", args.machine)
          .eq("startTime", args.startTime),
      )
      .first();

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!resourceUsage)
      await ctx.db.insert("resourceUsage", {
        resource: args.machine,
        project: args.project,
        // Enforce that it exists because of previous check
        maker: profile!._id,
        startTime: args.startTime,
        endTime: args.endTime,
        date: args.date,
      });
  },
});
