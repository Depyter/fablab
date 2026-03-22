import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkAuthority, claimFiles, deleteFiles } from "../helper";

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
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new Error("Unauthorized. Cannot update resource.");

    const updates: Partial<{
      name: string;
      type: string;
      description: string;
      status: "Unavailable" | "Available" | "Under Maintenance";
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteResource = mutation({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new Error("Unauthorized. Cannot delete resource.");

    const resource = await ctx.db.get(args.id);
    if (!resource) throw new Error("Resource not found!");

    if (resource.images) {
      await deleteFiles(ctx, resource.images);
    }

    await ctx.db.delete(args.id);
  },
});

export const addImageToResource = mutation({
  args: {
    resource: v.id("resources"),
    image: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new Error("Unauthorized. Cannot add Image to Resource.");

    const resource = await ctx.db.get(args.resource);

    if (!resource) throw new Error("Resource does not exist!");

    await ctx.db.patch(args.resource, {
      images: [...resource.images, args.image],
    });

    claimFiles(ctx, [args.image]);
  },
});

export const deleteImageFromResource = mutation({
  args: {
    resource: v.id("resources"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new Error("Unauthorized. Cannot delete Image from Resource.");

    const resource = await ctx.db.get(args.resource);

    if (!resource) throw new Error("Resource does not exist!");
    const updatedList = resource.images.filter((id) => id !== args.image);

    await ctx.db.patch(args.resource, {
      images: updatedList,
    });

    deleteFiles(ctx, [args.image]);
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
