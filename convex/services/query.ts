import { query } from "../_generated/server";
import { v } from "convex/values";

export const getServices = query({
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

export const getService = query({
  args: {
    service: v.id("services"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);
    if (!service) return null;
    const imageUrls = (
      await Promise.all(service.images.map((id) => ctx.storage.getUrl(id)))
    ).filter((url): url is string => url !== null);
    const sampleUrls = (
      await Promise.all(service.samples.map((id) => ctx.storage.getUrl(id)))
    ).filter((url): url is string => url !== null);
    return { ...service, imageUrls, sampleUrls };
  },
});
