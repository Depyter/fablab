import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles, deleteFiles } from "../helper";

export const addMaterial = authMutation({
  role: ["admin", "maker"],
  args: {
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    currentStock: v.number(),
    costPerUnit: v.optional(v.number()),
    pricePerUnit: v.optional(v.number()),
    reorderThreshold: v.optional(v.number()),
    color: v.optional(v.string()),
    status: v.union(
      v.literal("IN_STOCK"),
      v.literal("LOW_STOCK"),
      v.literal("OUT_OF_STOCK"),
    ),
    image: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const materialId = await ctx.db.insert("materials", {
      name: args.name,
      category: args.category,
      unit: args.unit,
      currentStock: args.currentStock,
      costPerUnit: args.costPerUnit,
      pricePerUnit: args.pricePerUnit,
      reorderThreshold: args.reorderThreshold,
      color: args.color,
      status: args.status,
      image: args.image,
    });

    if (args.image) {
      await claimFiles(ctx, [args.image]);
    }

    return materialId;
  },
});

export const updateMaterial = authMutation({
  role: ["admin", "maker"],
  args: {
    id: v.id("materials"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    unit: v.optional(v.string()),
    currentStock: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
    pricePerUnit: v.optional(v.number()),
    reorderThreshold: v.optional(v.number()),
    color: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("IN_STOCK"),
        v.literal("LOW_STOCK"),
        v.literal("OUT_OF_STOCK"),
      ),
    ),
    image: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.id);
    if (!material) throw new ConvexError("Material not found.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.category !== undefined) updates.category = args.category;
    if (args.unit !== undefined) updates.unit = args.unit;
    if (args.currentStock !== undefined) updates.currentStock = args.currentStock;
    if (args.costPerUnit !== undefined) updates.costPerUnit = args.costPerUnit;
    if (args.pricePerUnit !== undefined) updates.pricePerUnit = args.pricePerUnit;
    if (args.reorderThreshold !== undefined)
      updates.reorderThreshold = args.reorderThreshold;
    if (args.color !== undefined) updates.color = args.color;
    if (args.status !== undefined) updates.status = args.status;

    if (args.image !== undefined) {
      if (material.image && material.image !== args.image) {
        await deleteFiles(ctx, [material.image]);
      }
      updates.image = args.image;
      if (args.image) {
        await claimFiles(ctx, [args.image]);
      }
    }

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteMaterial = authMutation({
  role: ["admin", "maker"],
  args: {
    id: v.id("materials"),
  },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.id);
    if (!material) throw new ConvexError("Material not found.");

    if (material.image) {
      await deleteFiles(ctx, [material.image]);
    }

    await ctx.db.delete(args.id);
  },
});
