import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { authQuery } from "../helper";

export const getProjects = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
    dateFilter: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    searchText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === "admin" || role === "maker";

    const hasStatusFilter =
      args.statusFilter !== undefined && args.statusFilter !== "all";

    type StatusUnion =
      | "pending"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled"
      | "paid";

    // ── Search path: uses the search index, applies status as a filter field ─
    if (args.searchText && args.searchText.trim() !== "") {
      let searchQuery = ctx.db
        .query("projects")
        .withSearchIndex("search_body", (q) => {
          const base = q.search("searchText", args.searchText!);
          return hasStatusFilter
            ? base.eq("status", args.statusFilter as StatusUnion)
            : base;
        });

      if (!isPrivileged) {
        searchQuery = searchQuery.filter((q) =>
          q.eq(q.field("userId"), callerId),
        );
      }

      const result = await searchQuery.paginate(args.paginationOpts);
      const enrichedPage = await enrichProjects(ctx, result.page);
      return { ...result, page: enrichedPage };
    }

    // ── Sorted / filtered path ────────────────────────────────────────────────
    const baseQuery = ctx.db.query("projects");

    let orderedQuery;
    switch (args.sortBy) {
      case "price-high":
      case "price-low":
        // No price index; fall through to default creation-time order
        orderedQuery = baseQuery.order(args.sortBy === "price-high" ? "desc" : "asc");
        break;
      case "name-az":
        orderedQuery = baseQuery.order("asc");
        break;
      case "oldest":
        if (hasStatusFilter) {
          orderedQuery = baseQuery
            .withIndex("by_status", (q) =>
              q.eq("status", args.statusFilter as StatusUnion),
            )
            .order("asc");
        } else {
          orderedQuery = baseQuery.order("asc");
        }
        break;
      case "newest":
      default:
        if (hasStatusFilter) {
          orderedQuery = baseQuery
            .withIndex("by_status", (q) =>
              q.eq("status", args.statusFilter as StatusUnion),
            )
            .order("desc");
        } else {
          orderedQuery = baseQuery.order("desc");
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

    // dateFilter is not supported after the scheduling refactor
    // (startTime now lives on resourceUsage, not projects)

    const result = await query.paginate(args.paginationOpts);
    const enrichedPage = await enrichProjects(ctx, result.page);
    return { ...result, page: enrichedPage };
  },
});

// ── Shared enrichment helper ──────────────────────────────────────────────────

async function enrichProjects(ctx: QueryCtx, projects: Doc<"projects">[]) {
  return Promise.all(
    projects.map(async (project) => {
      const [clientProfile, service] = await Promise.all([
        ctx.db.get(project.userId as Id<"userProfile">),
        ctx.db.get(project.service as Id<"services">),
      ]);

      // Fetch usage directly by project
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .first();

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
        bookingStartTime: usage?.startTime ?? null,
        bookingEndTime: usage?.endTime ?? null,
        // Audit dates
        requestedDate: project._creationTime,
        estimatedPrice: project.totalInvoice?.total ?? 0,
        coverUrl,
      };
    }),
  );
}

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
          serviceCategory: serviceDoc.serviceCategory,
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
    // Resource usages — source of truth for booking window and resource
    // -------------------------------------------------------------------------
    const usageDocs = await ctx.db
      .query("resourceUsage")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    const resourceUsages = await Promise.all(
      usageDocs.map(async (usage) => {
        const resourceDoc = usage.resource
          ? await ctx.db.get(usage.resource as Id<"resources">)
          : null;

        const enrichedMaterialsUsed = usage.materialsUsed
          ? await Promise.all(
              usage.materialsUsed.map(async (m) => {
                if (m.snapshot) {
                  return { ...m, name: m.snapshot.name, unit: m.snapshot.unit };
                }
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

        const resourceDetails = {
          _id: usage.resource ?? null,
          name: usage.snapshot.name,
          category: resourceDoc?.category ?? null,
          type: resourceDoc?.type ?? null,
          status: resourceDoc?.status ?? null,
          description: resourceDoc?.description ?? null,
        };

        return {
          ...usage,
          resourceDetails,
          materialsUsed: enrichedMaterialsUsed,
        };
      }),
    );

    // Derive the primary booking window from the first matching usage
    const primaryUsage = usageDocs[0] ?? null;

    // -------------------------------------------------------------------------
    // Requested materials
    // -------------------------------------------------------------------------
    const requestedMaterials = project.requestedMaterials
      ? (
          await Promise.all(
            project.requestedMaterials.map(async (id) => {
              const doc = await ctx.db.get(id as Id<"materials">);
              return doc
                ? {
                    _id: doc._id,
                    name: doc.name,
                    unit: doc.unit,
                    pricePerUnit: doc.pricePerUnit ?? 0,
                  }
                : null;
            }),
          )
        ).filter((m): m is NonNullable<typeof m> => m !== null)
      : [];

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
      requestedMaterials,
      threadId: thread?._id ?? null,
      roomId: thread?.roomId ?? null,
    };
  },
});
