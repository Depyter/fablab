import { v } from "convex/values";
import { authQuery } from "../helper";

export const getResources = authQuery({
  role: ["admin", "maker"],
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db.query("resources").collect();

    return await Promise.all(
      resources.map(async (resource) => {
        const imageUrls = await Promise.all(
          resource.images.map(async (id) => {
            return await ctx.storage.getUrl(id);
          }),
        );
        return {
          ...resource,
          imageUrls: imageUrls.filter((url): url is string => url !== null),
        };
      }),
    );
  },
});

export const getBookings = authQuery({
  role: ["admin", "maker"],
  args: {
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const nextDay = args.date + 24 * 60 * 60 * 1000;

    const machineUsages = await ctx.db
      .query("resourceUsage")
      .withIndex("by_date_resource_startTime", (q) =>
        q.gte("date", args.date).lt("date", nextDay),
      )
      .collect();

    return await Promise.all(
      machineUsages.map(async (usage) => {
        const [project, maker, resource, service] = await Promise.all([
          ctx.db.get(usage.project),
          usage.maker ? ctx.db.get(usage.maker) : undefined,
          usage.resource ? ctx.db.get(usage.resource) : undefined,
          ctx.db.get(usage.service),
        ]);

        return { ...usage, project, maker, resource, service };
      }),
    );
  },
});
