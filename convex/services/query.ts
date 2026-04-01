import { v } from "convex/values";
import { publicQuery } from "../helper";

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
    return { ...service, imageUrls, sampleUrls };
  },
});
