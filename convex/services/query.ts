import { v } from "convex/values";
import { publicQuery } from "../helper";
import type { Id } from "../_generated/dataModel";

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

function normalizeServiceForRead<
  T extends { serviceCategory: { type: string } },
>(service: T): T {
  if (service.serviceCategory.type !== "FABRICATION") return service;

  const availableDays =
    "availableDays" in service.serviceCategory &&
    Array.isArray(service.serviceCategory.availableDays) &&
    service.serviceCategory.availableDays.length > 0
      ? service.serviceCategory.availableDays
      : [...EVERY_DAY];

  return {
    ...service,
    serviceCategory: {
      ...service.serviceCategory,
      availableDays,
    },
  };
}

export const getServices = publicQuery({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return Promise.all(
      services.map(async (service) => {
        const normalizedService = normalizeServiceForRead(service);
        const imageUrls = (
          await Promise.all(
            normalizedService.images.map((id) => ctx.storage.getUrl(id)),
          )
        ).filter((url): url is string => url !== null);
        return { ...normalizedService, imageUrls };
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
    const normalizedService = normalizeServiceForRead(service);
    const imageUrls = (
      await Promise.all(
        normalizedService.images.map((id) => ctx.storage.getUrl(id)),
      )
    ).filter((url): url is string => url !== null);
    const sampleUrls = (
      await Promise.all(
        normalizedService.samples.map((id) => ctx.storage.getUrl(id)),
      )
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
    if (
      normalizedService.serviceCategory.type === "FABRICATION" &&
      normalizedService.serviceCategory.materials &&
      normalizedService.serviceCategory.materials.length > 0
    ) {
      materialDetails = await Promise.all(
        normalizedService.serviceCategory.materials.map(async (materialId) => {
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

    const resourceDetails =
      normalizedService.resources && normalizedService.resources.length > 0
        ? (
            await Promise.all(
              normalizedService.resources.map(async (resourceId) => {
                const resource = await ctx.db.get(resourceId);
                if (!resource) return null;
                return {
                  _id: resource._id,
                  name: resource.name,
                  category: resource.category,
                  type: resource.type,
                  status: resource.status,
                  description: resource.description,
                };
              }),
            )
          ).filter((resource): resource is NonNullable<typeof resource> => {
            return resource !== null;
          })
        : [];

    return {
      ...normalizedService,
      imageUrls,
      sampleUrls,
      materialDetails,
      resourceDetails,
    };
  },
});

export const getBookedTimeSlots = publicQuery({
  args: {
    serviceId: v.id("services"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const usages = await ctx.db
      .query("resourceUsage")
      .withIndex("by_service", (q) => q.eq("service", args.serviceId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), args.date),
          q.lt(q.field("startTime"), args.date + 24 * 60 * 60 * 1000),
        ),
      )
      .collect();

    return usages.map((u) => ({
      startTime: u.startTime,
      endTime: u.endTime,
    }));
  },
});
