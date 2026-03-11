import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkAuthority } from "./helper";

export const addService = mutation({
  args: {
    name: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    samples: v.array(v.id("_storage")),
    description: v.string(),
    requirements: v.array(v.string()),
    regularPrice: v.number(),
    upPrice: v.number(),
    unitPrice: v.string(),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    // properly check if admin user or maker
    if (!authorization) throw new Error("Unauthorized. Cannot add service.");

    await ctx.db.insert("services", {
      name: args.name,
      images: args.images,
      description: args.description,
      regularPrice: args.regularPrice,
      upPrice: args.upPrice,
      unitPrice: args.unitPrice,
      status: args.status,
      requirements: args.requirements,
      samples: args.samples,
    });
  },
});

export const updateService = mutation({
  args: {
    service: v.id("services"),
    name: v.optional(v.string()),
    regularPrice: v.optional(v.number()),
    upPrice: v.optional(v.number()),
    unitPrice: v.optional(v.string()),
    requirements: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("Unavailable"), v.literal("Available")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization) throw new Error("Unauthorized. Cannot add service.");

    const updates: Partial<{
      name: string;
      regularPrice: number;
      upPrice: number;
      unitPrice: string;
      requirements: string[];
      description: string;
      type: string;
      status: "Unavailable" | "Available";
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.regularPrice !== undefined)
      updates.regularPrice = args.regularPrice;
    if (args.upPrice !== undefined) updates.upPrice = args.upPrice;
    if (args.unitPrice !== undefined) updates.unitPrice = args.unitPrice;
    if (args.requirements !== undefined)
      updates.requirements = args.requirements;

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

export const addSampleToService = mutation({
  args: {
    service: v.id("services"),
    sample: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    // properly check auth roles then addImage

    const service = await ctx.db.get(args.service);

    if (!service) throw new Error("Service does not exist!");

    await ctx.db.patch("services", args.service, {
      samples: [...service.samples, args.sample],
    });
  },
});

export const deleteService = mutation({
  args: {
    service: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization) throw new Error("Unauthorized. Cannot delete service.");

    const service = await ctx.db.get(args.service);

    if (!service) throw new Error("Service not found!");
    await Promise.all(service.images.map((image) => ctx.storage.delete(image)));
    await Promise.all(
      service.samples.map((image) => ctx.storage.delete(image)),
    );
    await ctx.db.delete("services", args.service);
  },
});

export const deleteImageFromService = mutation({
  args: {
    service: v.id("services"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new Error("Service does not exist!");
    const updatedList = service.images.filter((id) => id !== args.image);
    await ctx.storage.delete(args.image);

    await ctx.db.patch("services", args.service, {
      images: updatedList,
    });
  },
});

export const deleteSampleFromService = mutation({
  args: {
    service: v.id("services"),
    sample: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new Error("Service does not exist!");
    const updatedList = service.samples.filter((id) => id !== args.sample);
    await ctx.storage.delete(args.sample);

    await ctx.db.patch("services", args.service, {
      samples: updatedList,
    });
  },
});
