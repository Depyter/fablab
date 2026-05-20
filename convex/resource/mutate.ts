import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles, deleteFiles } from "../helper";

export const addResource = authMutation({
  role: ["admin", "maker"],
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

export const updateResource = authMutation({
  role: ["admin", "maker"],
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

export const deleteResource = authMutation({
  role: ["admin", "maker"],
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) throw new ConvexError("Resource not found!");

    // Prevent deletion if any active resourceUsage records reference this resource.
    const activeUsage = await ctx.db
      .query("resourceUsage")
      .withIndex("by_resource_startTime", (q) => q.eq("resource", args.id))
      .first();
    if (activeUsage) {
      throw new ConvexError(
        "Cannot delete a resource that has active bookings. Reschedule them first.",
      );
    }

    if (resource.images) {
      await deleteFiles(ctx, resource.images);
    }

    await ctx.db.delete(args.id);
  },
});

export const addImageToResource = authMutation({
  role: ["admin", "maker"],
  args: {
    resource: v.id("resources"),
    image: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resource);

    if (!resource) throw new ConvexError("Resource does not exist!");

    await ctx.db.patch(args.resource, {
      images: [...resource.images, args.image],
    });

    claimFiles(ctx, [args.image]);
  },
});

export const deleteImageFromResource = authMutation({
  role: ["admin", "maker"],
  args: {
    resource: v.id("resources"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resource);

    if (!resource) throw new ConvexError("Resource does not exist!");
    const updatedList = resource.images.filter((id) => id !== args.image);

    await ctx.db.patch(args.resource, {
      images: updatedList,
    });

    deleteFiles(ctx, [args.image]);
  },
});
