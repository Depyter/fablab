import { v } from "convex/values";
import { authQuery } from "../helper";
import { overlapsTimeRange } from "../../src/lib/time-range";

export const getCalendarFrame = authQuery({
  role: ["admin", "maker", "client"],
  args: {},
  handler: async (ctx) => {
    const { role } = ctx.profile;
    const isAdminOrMaker = role === "admin" || role === "maker";

    const [services, resources] = await Promise.all([
      ctx.db.query("services").collect(),
      isAdminOrMaker ? ctx.db.query("resources").collect() : Promise.resolve([]),
    ]);

    return {
      role,
      services: services.map((service) => ({
         _id: service._id,
         name: service.name,
         slug: service.slug,
         status: service.status,
         serviceCategoryType: service.serviceCategory.type,
       })),
      resources: resources.map((resource) => ({
        _id: resource._id,
        name: resource.name,
        category: resource.category,
        description: resource.description,
        status: resource.status,
      })),
    };
  },
});

export const getCalendarBookings = authQuery({
  role: ["admin", "maker", "client"],
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const { role, _id: callerId } = ctx.profile;

    const [candidateUsages, myProjects] = await Promise.all([
      ctx.db
        .query("resourceUsage")
        .withIndex("by_startTime", (q) =>
          q.lt("startTime", args.endTime),
        )
        .collect(),
      role === "client"
        ? ctx.db
            .query("projects")
            .withIndex("by_userProfile", (q) => q.eq("userId", callerId))
            .collect()
        : Promise.resolve([]),
    ]);
    const usages = candidateUsages.filter((usage) =>
      overlapsTimeRange(
        usage.startTime,
        usage.endTime,
        args.startTime,
        args.endTime,
      ),
    );

    const myProjectIds = new Set(myProjects.map((project) => project._id));
    const visibleProjectIds = new Set(
      usages
        .filter((usage) => role !== "client" || myProjectIds.has(usage.projectId))
        .map((usage) => usage.projectId),
    );

    const projectDocs = await Promise.all(
      Array.from(visibleProjectIds).map((projectId) => ctx.db.get(projectId)),
    );
    const projectById = new Map(
      projectDocs
        .filter((project): project is NonNullable<typeof project> => project !== null)
        .map((project) => [project._id, project]),
    );

    const clientIds = new Set(
      projectDocs.flatMap((project) => (project ? [project.userId] : [])),
    );
    const clientDocs = await Promise.all(
      Array.from(clientIds).map((clientId) => ctx.db.get(clientId)),
    );
    const clientById = new Map(
      clientDocs
        .filter((client): client is NonNullable<typeof client> => client !== null)
        .map((client) => [client._id, client]),
    );

    return usages.map((usage) => {
      const isOwned = myProjectIds.has(usage.projectId);
      const canSeeDetails = role !== "client" || isOwned;
      const project = canSeeDetails ? projectById.get(usage.projectId) : null;
      const client =
        canSeeDetails && project ? clientById.get(project.userId) : null;

      return {
        _id: usage._id,
        startTime: usage.startTime,
        endTime: usage.endTime,
        projectId: canSeeDetails ? usage.projectId : null,
        projectAlias: canSeeDetails
          ? project?.name || "Unknown Project"
          : "Reserved Slot",
        projectStatus: project?.status || "pending",
        clientName: canSeeDetails
          ? client?.name || "Unknown Client"
          : "Reserved Slot",
        serviceId: usage.service,
        resourceId: usage.resource || null,
      };
    });
  },
});
