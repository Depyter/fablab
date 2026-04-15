import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { authQuery } from "../helper";

export const getProjects = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!userProfile) throw new ConvexError("User not authorized");

    const baseQuery = ctx.db.query("projects");

    const isPrivileged =
      userProfile.role === "admin" || userProfile.role === "maker";

    const scopedQuery = isPrivileged
      ? baseQuery
      : baseQuery.withIndex("by_userProfile", (q) =>
          q.eq("userId", userProfile._id),
        );

    const result = await scopedQuery
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page.map(async (project) => {
        const clientProfile = await ctx.db.get(project.userId);
        const service = await ctx.db.get(project.service);

        // Find resource usage for date/time
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_service", (q) => q.eq("service", project.service))
          .collect();
        const usage = usages.find((u) => u.projects.includes(project._id));

        const coverUrl =
          service?.images && service.images.length > 0
            ? await ctx.storage.getUrl(service.images[0])
            : null;

        const makerProfile = project.assignedMaker
          ? await ctx.db.get(project.assignedMaker)
          : null;
        const makerPfpUrl = makerProfile?.profilePic
          ? await ctx.storage.getUrl(makerProfile.profilePic)
          : null;

        return {
          ...project,
          clientName: clientProfile?.name ?? "Unknown Client",
          serviceName: service?.name ?? "Unknown Service",
          assignedMaker: makerProfile
            ? {
                _id: makerProfile._id,
                name: makerProfile.name,
                pfpUrl: makerPfpUrl,
              }
            : null,
          bookingDate:
            usage?.date ??
            (service?.serviceCategory.type === "WORKSHOP"
              ? service.serviceCategory.date
              : undefined) ??
            Date.now(),
          bookingTime:
            project.selectedTimeSlot?.startTime ??
            usage?.startTime ??
            Date.now(),
          estimatedPrice: 0, // Fallback price calculation
          coverUrl,
        };
      }),
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

export const getProject = authQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);

    if (!project) throw new ConvexError("Project not found.");

    // Access control: admins and makers see all projects; a client can only
    // access a project they initiated.
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === "admin" || role === "maker";

    if (!isPrivileged && project.userId !== callerId) {
      throw new ConvexError("You do not have permission to view this project.");
    }

    // -------------------------------------------------------------------------
    // Client profile — name + profile picture URL
    // -------------------------------------------------------------------------
    const clientProfile = await ctx.db.get(project.userId);
    const clientPfpUrl = clientProfile?.profilePic
      ? await ctx.storage.getUrl(clientProfile.profilePic)
      : null;

    // -------------------------------------------------------------------------
    // Service — surface level only (name + status)
    // -------------------------------------------------------------------------
    const serviceDoc = await ctx.db.get(project.service);
    const service = serviceDoc
      ? {
          _id: serviceDoc._id,
          name: serviceDoc.name,
          status: serviceDoc.status,
          pricing: serviceDoc.pricing,
        }
      : null;

    // -------------------------------------------------------------------------
    // Files — metadata from the `files` table + signed storage URL
    // The project stores these as plain strings (storage IDs from the frontend).
    // -------------------------------------------------------------------------
    const resolvedFiles = project.files
      ? await Promise.all(
          project.files.map(async (rawId) => {
            const storageId = rawId as Id<"_storage">;

            const [fileDoc, url] = await Promise.all([
              ctx.db
                .query("files")
                .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
                .first(),
              ctx.storage.getUrl(storageId),
            ]);

            if (!fileDoc)
              return {
                storageId,
                url,
                originalName: null,
                type: null,
                status: null,
              };

            const { originalName, type, status } = fileDoc;
            return { storageId, url, originalName, type, status };
          }),
        )
      : [];

    // -------------------------------------------------------------------------
    // Receipt — full document
    // -------------------------------------------------------------------------
    const receipt = project.receipt ? await ctx.db.get(project.receipt) : null;

    // -------------------------------------------------------------------------
    // Resource usages for this project — includes resolved maker and resource
    // -------------------------------------------------------------------------
    const allUsagesForService = await ctx.db
      .query("resourceUsage")
      .withIndex("by_service", (q) => q.eq("service", project.service))
      .collect();

    const usageDocs = allUsagesForService.filter((u) =>
      u.projects.includes(project._id),
    );

    const resourceUsages = await Promise.all(
      usageDocs.map(async (usage) => {
        const makerProfile = usage.maker ? await ctx.db.get(usage.maker) : null;
        const resourceDoc = usage.resource
          ? await ctx.db.get(usage.resource)
          : null;

        const resourceImageUrls = resourceDoc?.images
          ? await Promise.all(
              resourceDoc.images.map((id) => ctx.storage.getUrl(id)),
            )
          : [];

        const makerPfpUrl = makerProfile?.profilePic
          ? await ctx.storage.getUrl(makerProfile.profilePic)
          : null;

        return {
          ...usage,
          makerName: makerProfile?.name ?? null,
          makerPfpUrl,
          resourceDetails: resourceDoc
            ? {
                ...resourceDoc,
                imageUrls: resourceImageUrls.filter((url) => url !== null),
              }
            : null,
        };
      }),
    );

    // -------------------------------------------------------------------------
    // Thread
    // -------------------------------------------------------------------------
    const thread = await ctx.db
      .query("threads")
      .withIndex("projectId", (q) => q.eq("projectId", project._id))
      .first();

    // -------------------------------------------------------------------------
    // Assigned Maker
    // -------------------------------------------------------------------------
    const assignedMakerProfile = project.assignedMaker
      ? await ctx.db.get(project.assignedMaker)
      : null;
    const assignedMakerPfpUrl = assignedMakerProfile?.profilePic
      ? await ctx.storage.getUrl(assignedMakerProfile.profilePic)
      : null;

    // -------------------------------------------------------------------------
    // Final shape
    // -------------------------------------------------------------------------
    return {
      ...project,
      client: {
        _id: clientProfile?._id ?? null,
        name: clientProfile?.name ?? "Unknown Client",
        pfpUrl: clientPfpUrl,
      },
      assignedMaker: assignedMakerProfile
        ? {
            _id: assignedMakerProfile._id,
            name: assignedMakerProfile.name,
            pfpUrl: assignedMakerPfpUrl,
          }
        : null,
      service,
      resolvedFiles,
      receipt,
      resourceUsages,
      threadId: thread?._id ?? null,
      roomId: thread?.roomId ?? null,
    };
  },
});
