import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { authQuery } from "../helper";

export const getProjects = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
    dateFilter: v.optional(v.string()),
    sortBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === "admin" || role === "maker";

    const baseQuery = ctx.db.query("projects");

    const hasStatusFilter =
      args.statusFilter !== undefined && args.statusFilter !== "all";

    type StatusUnion =
      | "pending"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled";

    let orderedQuery;
    switch (args.sortBy) {
      case "price-high":
        orderedQuery = baseQuery
          .withIndex("by_totalCost_startTime")
          .order("desc");
        break;
      case "price-low":
        orderedQuery = baseQuery
          .withIndex("by_totalCost_startTime")
          .order("asc");
        break;
      case "name-az":
        orderedQuery = baseQuery.withIndex("by_name_startTime").order("asc");
        break;
      case "oldest":
        if (hasStatusFilter) {
          orderedQuery = baseQuery
            .withIndex("by_status_startTime", (q) =>
              q.eq("status", args.statusFilter as StatusUnion),
            )
            .order("asc");
        } else {
          orderedQuery = baseQuery.withIndex("by_startTime").order("asc");
        }
        break;
      case "newest":
      default:
        if (hasStatusFilter) {
          orderedQuery = baseQuery
            .withIndex("by_status_startTime", (q) =>
              q.eq("status", args.statusFilter as StatusUnion),
            )
            .order("desc");
        } else {
          orderedQuery = baseQuery.withIndex("by_startTime").order("desc");
        }
        break;
    }

    let query = orderedQuery;

    if (!isPrivileged) {
      query = query.filter((q) => q.eq(q.field("userId"), callerId));
    }

    if (
      hasStatusFilter &&
      args.sortBy !== "newest" &&
      args.sortBy !== "oldest"
    ) {
      query = query.filter((q) =>
        q.eq(q.field("status"), args.statusFilter as StatusUnion),
      );
    }

    if (args.dateFilter && args.dateFilter !== "all") {
      const now = new Date();
      let start = 0;
      let end = Number.MAX_SAFE_INTEGER;

      if (args.dateFilter === "today") {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();
        end = start + 24 * 60 * 60 * 1000 - 1;
      } else if (args.dateFilter === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff).getTime();
        end = start + 7 * 24 * 60 * 60 * 1000 - 1;
      } else if (args.dateFilter === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ).getTime();
      }

      query = query.filter((q) =>
        q.and(
          q.gte(q.field("selectedTimeSlot.startTime"), start),
          q.lte(q.field("selectedTimeSlot.startTime"), end),
        ),
      );
    }

    const result = await query.paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page.map(async (project) => {
        const [clientProfile, service] = await Promise.all([
          ctx.db.get(project.userId as Id<"userProfile">),
          ctx.db.get(project.service as Id<"services">),
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
          ? await ctx.db.get(project.assignedMaker as Id<"userProfile">)
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
    const clientProfile = await ctx.db.get(project.userId as Id<"userProfile">);
    const clientPfpUrl = clientProfile?.profilePic
      ? await ctx.storage.getUrl(clientProfile.profilePic)
      : null;

    // -------------------------------------------------------------------------
    // Service
    // -------------------------------------------------------------------------
    const serviceDoc = await ctx.db.get(project.service as Id<"services">);
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
    const receipt = project.receipt
      ? await ctx.db.get(project.receipt as Id<"receipts">)
      : null;

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

    // Resolve service-level resources as a fallback
    const serviceResources =
      serviceDoc?.resources && serviceDoc.resources.length > 0
        ? await Promise.all(
            serviceDoc.resources.map((rId) =>
              ctx.db.get(rId as Id<"resources">),
            ),
          )
        : [];

    const resourceUsages = await Promise.all(
      usageDocs.map(async (usage) => {
        // Prefer the usage's own resource; fall back to service-level resources
        let resourceDoc = usage.resource
          ? await ctx.db.get(usage.resource as Id<"resources">)
          : null;

        if (!resourceDoc && serviceResources.length > 0) {
          resourceDoc = serviceResources[0] ?? null;
        }

        const [makerProfile] = await Promise.all([
          usage.maker ? ctx.db.get(usage.maker as Id<"userProfile">) : null,
        ]);

        const makerPfpUrl = makerProfile?.profilePic
          ? await ctx.storage.getUrl(makerProfile.profilePic)
          : null;

        const enrichedMaterialsUsed = usage.materialsUsed
          ? await Promise.all(
              usage.materialsUsed.map(async (m) => {
                const materialDoc = await ctx.db.get(
                  m.materialId as Id<"materials">,
                );
                return {
                  ...m,
                  name: materialDoc?.name ?? "Unknown Material",
                  unit: materialDoc?.unit ?? "units",
                };
              }),
            )
          : [];

        return {
          ...usage,
          makerName: makerProfile?.name ?? null,
          makerPfpUrl,
          resourceDetails: resourceDoc
            ? {
                _id: resourceDoc._id,
                name: resourceDoc.name,
                category: resourceDoc.category,
                type: resourceDoc.type,
                status: resourceDoc.status,
                description: resourceDoc.description,
              }
            : null,
          materialsUsed: enrichedMaterialsUsed,
        };
      }),
    );

    // Derive the primary booking window from the first matching usage
    const primaryUsage = usageDocs[0] ?? null;

    // -------------------------------------------------------------------------
    // Requested material
    // -------------------------------------------------------------------------
    const requestedMaterialDoc = project.requestedMaterialId
      ? await ctx.db.get(project.requestedMaterialId as Id<"materials">)
      : null;
    const requestedMaterial = requestedMaterialDoc
      ? {
          _id: requestedMaterialDoc._id,
          name: requestedMaterialDoc.name,
          unit: requestedMaterialDoc.unit,
          pricePerUnit: requestedMaterialDoc.pricePerUnit ?? 0,
        }
      : null;

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
      ? await ctx.db.get(project.assignedMaker as Id<"userProfile">)
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
      requestedMaterial,
      threadId: thread?._id ?? null,
      roomId: thread?.roomId ?? null,
    };
  },
});
