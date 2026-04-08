import { internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import {
  authMutation,
  checkAuthority,
  claimFiles,
  deleteFiles,
  slugify,
} from "../helper";

// called when user discards current service
export const deleteOrphanedFiles = authMutation({
  role: ["admin", "maker"],
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    deleteFiles(ctx, args.storageIds);
  },
});

export const cleanOrphanedFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orphans = await ctx.db
      .query("files")
      .withIndex("status", (q) => q.eq("status", "orphaned"))
      .collect();
    await Promise.all(
      orphans.map(async (orphan) => {
        await ctx.storage.delete(orphan.storageId);
        await ctx.db.delete(orphan._id);
      }),
    );
  },
});

export const addService = authMutation({
  role: ["admin", "maker"],
  args: {
    name: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    samples: v.array(v.id("_storage")),
    description: v.string(),
    requirements: v.array(v.string()),
    serviceCategory: v.union(v.literal("WORKSHOP"), v.literal("FABRICATION")),
    pricing: v.union(
      v.object({
        type: v.literal("FIXED"),
        amount: v.number(),
        upAmount: v.optional(v.number()),
      }),
      v.object({
        type: v.literal("PER_UNIT"),
        baseFee: v.number(),
        upBaseFee: v.optional(v.number()),
        unitName: v.string(),
        ratePerUnit: v.number(),
        upRatePerUnit: v.optional(v.number()),
      }),
      v.object({
        type: v.literal("COMPOSITE"),
        baseFee: v.number(),
        upBaseFee: v.optional(v.number()),
        timeRatePerHour: v.number(),
        upTimeRatePerHour: v.optional(v.number()),
      }),
    ),
    fileTypes: v.array(v.string()),
    resources: v.optional(v.array(v.id("resources"))),
    materials: v.optional(v.array(v.id("materials"))),
    availableDays: v.optional(v.array(v.number())),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("services", {
      name: args.name,
      slug: slugify(args.name),
      images: args.images,
      description: args.description,
      serviceCategory: args.serviceCategory,
      pricing: args.pricing,
      fileTypes: args.fileTypes,
      resources: args.resources,
      materials: args.materials,
      availableDays: args.availableDays,
      status: args.status,
      requirements: args.requirements,
      samples: args.samples,
    });

    if (args.images.length > 0) claimFiles(ctx, args.images);
    if (args.samples.length > 0) claimFiles(ctx, args.samples);
  },
});

export const updateService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    name: v.optional(v.string()),
    serviceCategory: v.optional(
      v.union(v.literal("WORKSHOP"), v.literal("FABRICATION")),
    ),
    pricing: v.optional(
      v.union(
        v.object({
          type: v.literal("FIXED"),
          amount: v.number(),
          upAmount: v.optional(v.number()),
        }),
        v.object({
          type: v.literal("PER_UNIT"),
          baseFee: v.number(),
          upBaseFee: v.optional(v.number()),
          unitName: v.string(),
          ratePerUnit: v.number(),
          upRatePerUnit: v.optional(v.number()),
        }),
        v.object({
          type: v.literal("COMPOSITE"),
          baseFee: v.number(),
          upBaseFee: v.optional(v.number()),
          timeRatePerHour: v.number(),
          upTimeRatePerHour: v.optional(v.number()),
        }),
      ),
    ),
    requirements: v.optional(v.array(v.string())),
    fileTypes: v.optional(v.array(v.string())),
    resources: v.optional(v.array(v.id("resources"))),
    materials: v.optional(v.array(v.id("materials"))),
    availableDays: v.optional(v.array(v.number())),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("Unavailable"), v.literal("Available")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new ConvexError("Unauthorized. Cannot add service.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (args.name !== undefined) {
      updates.name = args.name;
      updates.slug = slugify(args.name);
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.serviceCategory !== undefined)
      updates.serviceCategory = args.serviceCategory;
    if (args.pricing !== undefined) updates.pricing = args.pricing;
    if (args.requirements !== undefined)
      updates.requirements = args.requirements;
    if (args.fileTypes !== undefined) updates.fileTypes = args.fileTypes;
    if (args.resources !== undefined) updates.resources = args.resources;
    if (args.materials !== undefined) updates.materials = args.materials;
    if (args.availableDays !== undefined)
      updates.availableDays = args.availableDays;

    await ctx.db.patch(args.service, updates);
  },
});

export const addImageToService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    image: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");

    await ctx.db.patch("services", args.service, {
      images: [...service.images, args.image],
    });

    claimFiles(ctx, [args.image]);
  },
});

export const addSampleToService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    sample: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");

    await ctx.db.patch("services", args.service, {
      samples: [...service.samples, args.sample],
    });

    claimFiles(ctx, [args.sample]);
  },
});

export const deleteService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service not found!");
    await deleteFiles(ctx, service.images);
    await deleteFiles(ctx, service.samples);
    await ctx.db.delete("services", args.service);
  },
});

export const deleteImageFromService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");
    const updatedList = service.images.filter((id) => id !== args.image);

    await ctx.db.patch("services", args.service, {
      images: updatedList,
    });

    deleteFiles(ctx, [args.image]);
  },
});

export const deleteSampleFromService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    sample: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");
    const updatedList = service.samples.filter((id) => id !== args.sample);

    await ctx.db.patch("services", args.service, {
      samples: updatedList,
    });

    deleteFiles(ctx, [args.sample]);
  },
});
