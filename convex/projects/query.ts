import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { UserRole } from "../constants";
import { authQuery } from "../helper";
import {
  addLabDays,
  endOfLabMonth,
  endOfLabWeek,
  getCurrentTimestamp,
  getLabDayBoundsMs,
  getLabDayStartTimestamp,
  startOfLabMonth,
  startOfLabWeek,
} from "../../src/lib/lab-time";

const PROJECT_WEEK_STARTS_ON = 1 as const;
type StatusUnion =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled"
  | "paid"
  | "claimed";

function resolveProjectDateBounds(dateFilter?: string) {
  const now = getCurrentTimestamp();

  if (dateFilter === "today") {
    return getLabDayBoundsMs(now);
  }

  if (dateFilter === "week") {
    const start = startOfLabWeek(now, PROJECT_WEEK_STARTS_ON);
    const end = endOfLabWeek(now, PROJECT_WEEK_STARTS_ON);

    return {
      startTime: start.getTime(),
      endTime: addLabDays(end, 1).getTime(),
    };
  }

  if (dateFilter === "month") {
    const start = startOfLabMonth(now);
    const end = endOfLabMonth(now);

    return {
      startTime: start.getTime(),
      endTime: addLabDays(end, 1).getTime(),
    };
  }

  return null;
}

function compareByCreationTime(left: Doc<"projects">, right: Doc<"projects">) {
  return (
    left._creationTime - right._creationTime ||
    left._id.localeCompare(right._id)
  );
}

function compareUsageOrder(
  left: Doc<"resourceUsage">,
  right: Doc<"resourceUsage">,
) {
  return (
    left.startTime - right.startTime ||
    left._creationTime - right._creationTime ||
    left._id.localeCompare(right._id)
  );
}

function sortProjectsForList(projects: Doc<"projects">[], sortBy?: string) {
  const sorted = [...projects];

  if (sortBy === "oldest" || sortBy === "price-low" || sortBy === "name-az") {
    sorted.sort(compareByCreationTime);
    return sorted;
  }

  sorted.sort((left, right) => compareByCreationTime(right, left));
  return sorted;
}

function getPaginationOffset(cursor: string | null) {
  if (cursor === null) return 0;

  const offset = Number(cursor);
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

function paginateProjects<T>(
  projects: T[],
  paginationOpts: { cursor: string | null; numItems: number },
) {
  const start = getPaginationOffset(paginationOpts.cursor);
  const end = Math.min(start + paginationOpts.numItems, projects.length);

  return {
    page: projects.slice(start, end),
    isDone: end >= projects.length,
    continueCursor: `${end}`,
  };
}

export const getProjects = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    type: v.optional(v.union(v.literal("WORKSHOP"), v.literal("FABRICATION"))),
    statusFilter: v.optional(v.string()),
    dateFilter: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    searchText: v.optional(v.string()),
    assignedToMe: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === UserRole.ADMIN || role === UserRole.MAKER;
    const filterByAssignedMaker =
      args.assignedToMe === true && role === UserRole.MAKER;

    const hasStatusFilter =
      args.statusFilter !== undefined && args.statusFilter !== "all";

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

      if (filterByAssignedMaker) {
        searchQuery = searchQuery.filter((q) =>
          q.eq(q.field("assignedMaker"), callerId),
        );
      }

      if (args.type) {
        searchQuery = searchQuery.filter((q) =>
          q.eq(q.field("type"), args.type!),
        );
      }

      const result = await searchQuery.paginate(args.paginationOpts);
      const enrichedPage = await enrichProjects(ctx, result.page);
      return { ...result, page: enrichedPage };
    }

    const dateBounds = resolveProjectDateBounds(args.dateFilter);
    if (dateBounds !== null) {
      const datedProjects = await ctx.db
        .query("projects")
        .withIndex("by_bookingStartTime", (q) =>
          q
            .gte("bookingStartTime", dateBounds.startTime)
            .lt("bookingStartTime", dateBounds.endTime),
        )
        .collect();

      const filteredProjects = sortProjectsForList(
        datedProjects.filter((project) => {
          if (!isPrivileged && project.userId !== callerId) {
            return false;
          }

          if (filterByAssignedMaker && project.assignedMaker !== callerId) {
            return false;
          }

          if (
            hasStatusFilter &&
            project.status !== (args.statusFilter as StatusUnion)
          ) {
            return false;
          }

          if (args.type && project.type !== args.type) {
            return false;
          }

          return true;
        }),
        args.sortBy,
      );
      const result = paginateProjects(filteredProjects, args.paginationOpts);
      const enrichedPage = await enrichProjects(ctx, result.page);
      return { ...result, page: enrichedPage };
    }

    // ── Sorted / filtered path ────────────────────────────────────────────────
    const baseQuery = ctx.db.query("projects");

    let orderedQuery;

    // Track whether the by_assignedMaker index already narrowed results
    // to avoid a redundant .filter() later.
    const assignedMakerIndexUsed = filterByAssignedMaker && !hasStatusFilter;

    if (assignedMakerIndexUsed) {
      orderedQuery = ctx.db
        .query("projects")
        .withIndex("by_assignedMaker", (q) => q.eq("assignedMaker", callerId))
        .order(args.sortBy === "oldest" ? "asc" : "desc");
    } else {
      switch (args.sortBy) {
        case "price-high":
        case "price-low":
          // No price index; fall through to default creation-time order
          orderedQuery = baseQuery.order(
            args.sortBy === "price-high" ? "desc" : "asc",
          );
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
          } else if (args.type) {
            orderedQuery = ctx.db
              .query("projects")
              .withIndex("by_type", (q) => q.eq("type", args.type!))
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
          } else if (args.type) {
            orderedQuery = ctx.db
              .query("projects")
              .withIndex("by_type", (q) => q.eq("type", args.type!))
              .order("desc");
          } else {
            orderedQuery = baseQuery.order("desc");
          }
          break;
      }
    }

    let query = orderedQuery;

    if (!isPrivileged) {
      query = query.filter((q) => q.eq(q.field("userId"), callerId));
    }

    // Only filter by assigned maker when the index didn't already handle it
    if (filterByAssignedMaker && !assignedMakerIndexUsed) {
      query = query.filter((q) => q.eq(q.field("assignedMaker"), callerId));
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

    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type!));
    }

    const result = await query.paginate(args.paginationOpts);
    const enrichedPage = await enrichProjects(ctx, result.page);
    return { ...result, page: enrichedPage };
  },
});

// ── Lightweight query: assigned project IDs ───────────────────────────────────
// Used by the chat sidebar to filter rooms to only assigned-project conversations.

export const getAssignedProjectIds = authQuery({
  args: {},
  handler: async (ctx) => {
    const { role, _id: callerId } = ctx.profile;
    if (role !== UserRole.MAKER) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_assignedMaker", (q) => q.eq("assignedMaker", callerId))
      .collect();

    return projects.map((p) => p._id);
  },
});

// ── Shared enrichment helper ──────────────────────────────────────────────────

async function enrichProjects(ctx: QueryCtx, projects: Doc<"projects">[]) {
  return Promise.all(
    projects.map(async (project) => {
      const [clientProfile, service, usageCount] = await Promise.all([
        ctx.db.get(project.userId as Id<"userProfile">),
        ctx.db.get(project.service as Id<"services">),
        ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
          .then((usages) => usages.length),
      ]);

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
        bookingStartTime: project.bookingStartTime ?? null,
        bookingEndTime: project.bookingEndTime ?? null,
        // Audit dates
        requestedDate: project._creationTime,
        estimatedPrice: project.totalInvoice?.total ?? 0,
        usageCount,
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

    // Access control: admin and maker see all projects;
    // client sees only their own.
    const { role, _id: callerId } = ctx.profile;

    const canView =
      role === UserRole.ADMIN ||
      role === UserRole.MAKER ||
      project.userId === callerId;

    if (!canView) {
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
          resources: serviceDoc.resources,
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
    const receipt = await (async () => {
      if (!project.receipt) return null;
      const doc = await ctx.db.get(project.receipt as Id<"receipts">);
      if (!doc) return null;
      const resolvedFiles = doc.files
        ? await Promise.all(
            doc.files.map(async (storageId) => {
              const [fileDoc, url] = await Promise.all([
                ctx.db
                  .query("files")
                  .withIndex("by_storageId", (q) =>
                    q.eq("storageId", storageId),
                  )
                  .first(),
                ctx.storage.getUrl(storageId),
              ]);
              return {
                storageId,
                url,
                type: fileDoc?.type ?? null,
                originalName: fileDoc?.originalName ?? null,
              };
            }),
          )
        : [];
      return { ...doc, resolvedFiles };
    })();

    // -------------------------------------------------------------------------
    // Resource usages — operational schedule/resource records
    // -------------------------------------------------------------------------
    const usageDocs = await ctx.db
      .query("resourceUsage")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const orderedUsageDocs = [...usageDocs].sort(compareUsageOrder);

    const resourceUsages = await Promise.all(
      orderedUsageDocs.map(async (usage) => {
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
          name: resourceDoc?.name ?? usage.snapshot.name,
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
      bookingStartTime: project.bookingStartTime ?? null,
      bookingEndTime: project.bookingEndTime ?? null,
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

// ── getWorkshopEvents ───────────────────────────────────────────────────────
// Aggregates workshop projects by (service, bookingStartTime) so staff can
// manage workshop events holistically.

export const getWorkshopEvents = authQuery({
  args: {
    serviceId: v.optional(v.id("services")),
    startTime: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("upcoming"), v.literal("past"), v.literal("all")),
    ),
  },
  handler: async (ctx, args) => {
    const status = args.status ?? "upcoming";
    const todayStart = getLabDayStartTimestamp(Date.now());

    // ── Determine time range ───────────────────────────────────────────────
    let minTime: number | undefined;
    let maxTime: number | undefined;

    if (status === "upcoming") {
      minTime = todayStart;
    } else if (status === "past") {
      maxTime = todayStart;
    }
    // "all" → no time filter

    // ── Query projects using the new composite index ───────────────────────
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_type_bookingStartTime", (q) => {
        if (minTime !== undefined) {
          return q.eq("type", "WORKSHOP").gte("bookingStartTime", minTime);
        }
        if (maxTime !== undefined) {
          return q.eq("type", "WORKSHOP").lt("bookingStartTime", maxTime);
        }
        return q.eq("type", "WORKSHOP");
      })
      .collect();

    // ── Filter by ownership for clients ────────────────────────────────────
    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === UserRole.ADMIN || role === UserRole.MAKER;
    const userFiltered = isPrivileged
      ? projects
      : projects.filter((p) => p.userId === callerId);

    // ── Filter (skip null bookingStartTime, apply serviceId / startTime) ───
    let filtered = userFiltered.filter((p) => p.bookingStartTime != null);

    if (args.serviceId) {
      filtered = filtered.filter((p) => p.service === args.serviceId);
    }
    if (args.startTime) {
      filtered = filtered.filter((p) => p.bookingStartTime === args.startTime);
    }

    // ── Group by (service, bookingStartTime) ───────────────────────────────
    const groups = new Map<string, Doc<"projects">[]>();
    for (const project of filtered) {
      const key = `${project.service}:${project.bookingStartTime}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(project);
      } else {
        groups.set(key, [project]);
      }
    }

    // ── Caches for service and userProfile lookups ────────────────────────
    const serviceCache = new Map<string, Doc<"services">>();
    const userProfileCache = new Map<string, Doc<"userProfile">>();

    async function getService(id: Id<"services">): Promise<Doc<"services">> {
      const key = id as string;
      const cached = serviceCache.get(key);
      if (cached) return cached;
      const doc = await ctx.db.get(id);
      if (!doc) throw new ConvexError("Service not found");
      serviceCache.set(key, doc);
      return doc;
    }

    async function getUserProfile(
      id: Id<"userProfile">,
    ): Promise<Doc<"userProfile">> {
      const key = id as string;
      const cached = userProfileCache.get(key);
      if (cached) return cached;
      const doc = await ctx.db.get(id);
      if (!doc) throw new ConvexError("User profile not found");
      userProfileCache.set(key, doc);
      return doc;
    }

    // ── Build events from groups ──────────────────────────────────────────
    const events: Array<{
      serviceId: Id<"services">;
      serviceName: string;
      serviceSlug: string;
      date: number;
      startTime: number;
      endTime: number;
      maxSlots: number;
      usedSlots: number;
      registrationCount: number;
      cancelledCount: number;
      statusBreakdown: Record<string, number>;
      attendees: Array<{
        projectId: Id<"projects">;
        userId: Id<"userProfile">;
        name: string;
        email: string;
        status: string;
        pfpUrl: string | null;
        createdAt: number;
        roomId: string | null;
        threadId: string | null;
      }>;
    }> = [];

    for (const [key, groupProjects] of groups.entries()) {
      const [serviceIdStr, startTimeStr] = key.split(":");
      const serviceId = serviceIdStr as unknown as Id<"services">;
      const bookingStartTime = Number(startTimeStr);

      const service = await getService(serviceId);

      // Resolve schedule details
      let endTime = bookingStartTime;
      let maxSlots = 0;
      let usedSlots = 0;

      if (service.serviceCategory.type === "WORKSHOP") {
        const projectDate = getLabDayStartTimestamp(bookingStartTime);
        const schedule = service.serviceCategory.schedules.find(
          (s) => s.date === projectDate,
        );
        if (schedule) {
          const timeSlot = schedule.timeSlots.find(
            (ts) => ts.startTime === bookingStartTime,
          );
          if (timeSlot) {
            endTime = timeSlot.endTime;
            maxSlots = timeSlot.maxSlots;
            usedSlots = timeSlot.usedUpSlots ?? 0;
          }
        }
      }

      // Use the first project's bookingEndTime as fallback
      if (groupProjects[0].bookingEndTime != null) {
        endTime = groupProjects[0].bookingEndTime;
      }

      // Separate active vs cancelled/rejected projects
      // Active projects drive the headline count and attendee list
      const TERMINAL_STATUSES = new Set(["cancelled", "rejected"]);
      const activeProjects = groupProjects.filter(
        (p) => !TERMINAL_STATUSES.has(p.status),
      );

      // Load attendee profiles (only for active projects)
      // Load threads for all active projects to resolve chat links
      const threadPromises = activeProjects.map((project) =>
        ctx.db
          .query("threads")
          .withIndex("projectId", (q) => q.eq("projectId", project._id))
          .first(),
      );
      const threads = await Promise.all(threadPromises);
      const threadByProjectId = new Map(
        threads
          .filter((t): t is NonNullable<typeof t> => t !== null)
          .map((t) => [t.projectId as string, t]),
      );

      const attendees = await Promise.all(
        activeProjects.map(async (project) => {
          const profile = await getUserProfile(project.userId);
          let pfpUrl: string | null = null;
          if (profile.profilePic) {
            try {
              pfpUrl = await ctx.storage.getUrl(profile.profilePic);
            } catch {
              // Gracefully handle inaccessible storage
            }
          }
          const thread = threadByProjectId.get(project._id as string);
          return {
            projectId: project._id,
            userId: project.userId,
            name: profile.name,
            email: profile.email,
            status: project.status,
            pfpUrl,
            createdAt: project._creationTime,
            roomId: thread?.roomId ?? null,
            threadId: thread?._id ?? null,
          };
        }),
      );

      // Build status breakdown
      const statusBreakdown: Record<string, number> = {};
      for (const p of groupProjects) {
        statusBreakdown[p.status] = (statusBreakdown[p.status] ?? 0) + 1;
      }

      events.push({
        serviceId,
        serviceName: service.name,
        serviceSlug: service.slug,
        date: getLabDayStartTimestamp(bookingStartTime),
        startTime: bookingStartTime,
        endTime,
        maxSlots,
        usedSlots,
        registrationCount: activeProjects.length,
        cancelledCount: groupProjects.length - activeProjects.length,
        statusBreakdown,
        attendees,
      });
    }

    // ── Sort and split into upcoming / past ──────────────────────────────
    const upcoming = events
      .filter((e) => e.startTime >= todayStart)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 50);

    const past = events
      .filter((e) => e.startTime < todayStart)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 50);

    return { upcoming, past };
  },
});
