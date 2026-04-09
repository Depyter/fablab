import { v } from "convex/values";
import { publicQuery } from "../helper";
import type { Id } from "../_generated/dataModel";

export const getServices = publicQuery({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return Promise.all(
      services.map(async (service) => {
        const imageUrls = (
          await Promise.all(service.images.map((id) => ctx.storage.getUrl(id)))
        ).filter((url): url is string => url !== null);
        return { ...service, imageUrls };
      }),
    );
  },
});

export const getService = publicQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!service) return null;
    const imageUrls = (
      await Promise.all(service.images.map((id) => ctx.storage.getUrl(id)))
    ).filter((url): url is string => url !== null);
    const sampleUrls = (
      await Promise.all(service.samples.map((id) => ctx.storage.getUrl(id)))
    ).filter((url): url is string => url !== null);

    let materialDetails: Array<{
      _id: Id<"materials">;
      name: string;
      category: string;
      unit: string;
      pricePerUnit?: number;
      costPerUnit?: number;
      currentStock?: number;
      status?: string;
      imageUrl: string | null;
    }> = [];
    if (service.materials && service.materials.length > 0) {
      materialDetails = await Promise.all(
        service.materials.map(async (materialId) => {
          const material = await ctx.db.get(materialId);
          const imageUrl = material?.image
            ? await ctx.storage.getUrl(material.image)
            : null;
          return {
            _id: materialId,
            name: material?.name || "Unknown",
            category: material?.category || "",
            unit: material?.unit || "",
            pricePerUnit: material?.pricePerUnit,
            costPerUnit: material?.costPerUnit,
            currentStock: material?.currentStock,
            status: material?.status,
            imageUrl,
          };
        }),
      );
    }

    return { ...service, imageUrls, sampleUrls, materialDetails };
  },
});
