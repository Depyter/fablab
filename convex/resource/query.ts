import { v } from "convex/values";
import { authQuery } from "../helper";
import { Id } from "../_generated/dataModel";

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
  role: ["admin", "maker", "client"],
  args: {
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const { role, _id: callerId } = ctx.profile;
    const nextDay = args.date + 24 * 60 * 60 * 1000;

    // Pre-fetch client's project IDs to check ownership without exposing others'
    const myProjectIds =
      role === "client"
        ? (
            await ctx.db
              .query("projects")
              .withIndex("by_userProfile", (q) => q.eq("userId", callerId))
              .collect()
          ).map((p) => p._id)
        : [];
    const myProjectIdsSet = new Set(myProjectIds);

    // No standalone by_startTime index on resourceUsage — filter in memory
    const allUsages = await ctx.db.query("resourceUsage").collect();
    const dayUsages = allUsages.filter(
      (u) => u.startTime >= args.date && u.startTime < nextDay,
    );

    return await Promise.all(
      dayUsages.map(async (usage) => {
        const isOwned = myProjectIdsSet.has(usage.projectId);
        const canSeeDetails = role !== "client" || isOwned;

        const [project, resource, service] = await Promise.all([
          canSeeDetails ? ctx.db.get(usage.projectId) : undefined,
          usage.resource ? ctx.db.get(usage.resource) : undefined,
          ctx.db.get(usage.service),
        ]);

        // Maker is on the project record, not the usage
        const maker =
          canSeeDetails && project?.assignedMaker
            ? await ctx.db.get(project.assignedMaker)
            : undefined;

        // Strip private fields for client views of others' bookings
        const { projectId, ...publicUsage } = usage;

        return {
          ...publicUsage,
          ...(canSeeDetails ? { projectId } : {}),
          project: project
            ? {
                _id: project._id,
                status: project.status,
                name: canSeeDetails ? project.name : "Reserved Slot",
              }
            : {
                _id: "" as Id<"projects">,
                status: "pending" as const,
                name: "Reserved Slot",
              },
          maker: maker
            ? {
                _id: maker._id,
                name: canSeeDetails ? maker.name : "FabLab Staff",
              }
            : {
                _id: "" as Id<"userProfile">,
                name: "FabLab Staff",
              },
          resource,
          service,
        };
      }),
    );
  },
});
