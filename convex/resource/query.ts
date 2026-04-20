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

    // Pre-fetch client's project IDs to safely check ownership without querying every project
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

    let query = ctx.db
      .query("resourceUsage")
      .withIndex("by_date_resource_startTime", (q) =>
        q.gte("date", args.date).lt("date", nextDay),
      );

    if (role === "client") {
      // Clients only see service-level bookings, not specific resource usages
      query = query.filter((q) => q.eq(q.field("resource"), undefined));
    }

    const machineUsages = await query.collect();

    return await Promise.all(
      machineUsages.map(async (usage) => {
        const firstProjectId =
          usage.projects && usage.projects.length > 0
            ? usage.projects[0]
            : undefined;

        // Determine if any project in this usage belongs to the client
        const ownedProjectId = usage.projects?.find((pId) =>
          myProjectIdsSet.has(pId),
        );

        // Access rules:
        // 1. Admins/Makers see the primary project details
        // 2. Clients only see details if they own a project in this usage
        const projectToFetch =
          role !== "client" ? firstProjectId : ownedProjectId;

        const [project, maker, resource, service] = await Promise.all([
          projectToFetch ? ctx.db.get(projectToFetch) : undefined,
          role !== "client" && usage.maker
            ? ctx.db.get(usage.maker)
            : undefined,
          usage.resource ? ctx.db.get(usage.resource) : undefined,
          ctx.db.get(usage.service),
        ]);

        const isOwner = role !== "client" || !!ownedProjectId;

        const result = {
          ...usage,
          project: project
            ? {
                _id: project._id,
                status: project.status,
                name: isOwner ? project.name : "Reserved Slot",
              }
            : {
                _id: "" as Id<"projects">,
                status: "pending" as const,
                name: "Reserved Slot",
              },
          maker: maker
            ? {
                _id: maker._id,
                name: isOwner ? maker.name : "FabLab Staff",
              }
            : {
                _id: "" as Id<"userProfile">,
                name: "FabLab Staff",
              },
          resource,
          service,
        };

        if (role === "client") {
          // Clients do not get the projects array for privacy, but we keep _id for the calendar view key
          const { projects, ...rest } = result;
          return rest;
        }

        return result;
      }),
    );
  },
});
