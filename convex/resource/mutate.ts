import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkAuthority, claimFiles } from "../helper";

export const addResource = mutation({
  args: {
    name: v.string(),
    category: v.union(
      v.literal("room"),
      v.literal("machine"),
      v.literal("tool"),
      v.literal("misc"),
    ),
    type: v.string(),
    images: v.array(v.id("_storage")),
    description: v.string(),
    status: v.union(
      v.literal("Unavailable"),
      v.literal("Available"),
      v.literal("Under Maintenance"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization) throw new Error("Unauthorized. Cannot add resource.");

    await ctx.db.insert("resources", {
      name: args.name,
      category: args.category,
      type: args.type,
      images: args.images,
      description: args.description,
      status: args.status,
    });

    claimFiles(ctx, args.images);
  },
});

export const updateResource = mutation({
  args: {
    id: v.id("resources"),
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("Unavailable"),
        v.literal("Available"),
        v.literal("Under Maintenance"),
      ),
    ),
  },
  handler: async (ctx, args) => {},
});

export const deleteResource = mutation({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {},
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
