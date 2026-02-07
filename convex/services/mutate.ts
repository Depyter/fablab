import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { authComponent } from "../auth";

export const addService = mutation({
  args: {
    name: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    description: v.string(),
    type: v.string(),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  },
  handler: async (ctx, args) => {
    const betterAuthUser = await authComponent.getAuthUser(ctx);
    // properly check if admin user or maker
    if (!betterAuthUser) throw new Error("Unauthorized");
    await ctx.db.insert("services", {
      name: args.name,
      images: args.images,
      description: args.description,
      type: args.type,
      status: args.status,
    });
  },
});

export const deleteService = mutation({
  args: {
    service: v.id("services"),
  },
  handler: async (ctx, args) => {
    // properly check auth roles then deleteService

    await ctx.db.delete("services", args.service);
  },
});

export const updateService = mutation({
  args: {
    service: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("Unavailable"), v.literal("Available")),
    ),
  },
  handler: async (ctx, args) => {
    // properly check auth roles then updateService
    const updates: Partial<{
      name: string;
      description: string;
      type: string;
      status: "Unavailable" | "Available";
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.type !== undefined) updates.type = args.type;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch("services", args.service, updates);
  },
});

export const addImageToService = mutation({
  args: {
    service: v.id("services"),
    image: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    // properly check auth roles then addImage

    const service = await ctx.db.get(args.service);

    if (!service) throw new Error("Service does not exist!");

    await ctx.db.patch("services", args.service, {
      images: [...service.images, args.image],
    });
  },
});

export const deleteImageToService = mutation({
  args: {
    service: v.id("services"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new Error("Service does not exist!");
    const updatedList = service.images.filter((id) => id !== args.image);

    await ctx.db.patch("services", args.service, {
      images: updatedList,
    });
  },
});
