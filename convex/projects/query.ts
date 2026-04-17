import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { authQuery } from "../helper";

export const getProjects = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === "admin" || role === "maker";

    const baseQuery = ctx.db.query("projects");

    const scopedQuery = isPrivileged
      ? baseQuery
      : baseQuery.withIndex("by_userProfile", (q) => q.eq("userId", callerId));

    const result = await scopedQuery
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page.map(async (project) => {
        const [clientProfile, service] = await Promise.all([
          ctx.db.get(project.userId),
          ctx.db.get(project.service),
        ]);

        // Resource usage is the source of truth for booking window
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
          // Booking window from resourceUsage
          bookingDate: usage?.date ?? null,
          bookingStartTime: usage?.startTime ?? null,
          bookingEndTime: usage?.endTime ?? null,
          // Audit dates
          requestedDate: project._creationTime,
          estimatedPrice: project.costBreakdown?.total ?? 0,
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

    // Access control: admins and makers see all; clients only their own
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === "admin" || role === "maker";

    if (!isPrivileged && project.userId !== callerId) {
      throw new ConvexError("You do not have permission to view this project.");
    }

    // -------------------------------------------------------------------------
    // Client profile
    // -------------------------------------------------------------------------
    const clientProfile = await ctx.db.get(project.userId);
    const clientPfpUrl = clientProfile?.profilePic
      ? await ctx.storage.getUrl(clientProfile.profilePic)
      : null;

    // -------------------------------------------------------------------------
    // Service
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
    // Files
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

            if (!fileDoc) {
              return {
                storageId,
                url,
                originalName: null,
                type: null,
                status: null,
              };
            }

            const { originalName, type, status } = fileDoc;
            return { storageId, url, originalName, type, status };
          }),
        )
      : [];

    // -------------------------------------------------------------------------
    // Receipt
    // -------------------------------------------------------------------------
    const receipt = project.receipt ? await ctx.db.get(project.receipt) : null;

    // -------------------------------------------------------------------------
    // Resource usages — source of truth for booking window, maker, resource
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
        const [makerProfile, resourceDoc] = await Promise.all([
          usage.maker ? ctx.db.get(usage.maker) : null,
          usage.resource ? ctx.db.get(usage.resource) : null,
        ]);

        const [resourceImageUrls, makerPfpUrl] = await Promise.all([
          resourceDoc?.images
            ? Promise.all(
                resourceDoc.images.map((id) => ctx.storage.getUrl(id)),
              )
            : Promise.resolve([]),
          makerProfile?.profilePic
            ? ctx.storage.getUrl(makerProfile.profilePic)
            : Promise.resolve(null),
        ]);

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

    // Derive the primary booking window from the first matching usage
    const primaryUsage = usageDocs[0] ?? null;

    // -------------------------------------------------------------------------
    // Thread
    // -------------------------------------------------------------------------
    const thread = await ctx.db
      .query("threads")
      .withIndex("projectId", (q) => q.eq("projectId", project._id))
      .first();

    // -------------------------------------------------------------------------
    // Assigned maker
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
      // Audit / tracking dates
      requestedDate: project._creationTime,
      // Booking window derived from resourceUsage
      bookingDate: primaryUsage?.date ?? null,
      bookingStartTime: primaryUsage?.startTime ?? null,
      bookingEndTime: primaryUsage?.endTime ?? null,
      // Relations
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
