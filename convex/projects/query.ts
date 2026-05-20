import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { UserRole } from "../constants";
import { authQuery } from "../helper";
import {
  buildProjectGroups,
  buildEventsFromGroups,
  splitUpcomingPast,
} from "./helper";
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
        email: clientProfile?.email ?? null,
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

    const { role, _id: callerId } = ctx.profile;
    const isPrivileged = role === UserRole.ADMIN || role === UserRole.MAKER;

    // ── For clients: query their own workshop projects only ────────────────
    if (!isPrivileged) {
      // Use the same indexed query but filtered to the caller's userId
      const myProjects = await ctx.db
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
        .filter((q) => q.eq(q.field("userId"), callerId))
        .collect();

      const groups = buildProjectGroups(
        myProjects,
        args.serviceId,
        args.startTime,
      );
      const events = await buildEventsFromGroups(ctx, groups);
      return splitUpcomingPast(events, todayStart);
    }

    // ── For staff: start from workshop service schedules ─────────────────
    // Load all services and filter to workshops in memory
    const allServices = await ctx.db.query("services").collect();
    let workshopServices = allServices.filter(
      (s): s is Doc<"services"> & { serviceCategory: { type: "WORKSHOP" } } =>
        s.serviceCategory.type === "WORKSHOP",
    );

    // Filter by serviceId if provided (calendar click-through)
    if (args.serviceId) {
      workshopServices = workshopServices.filter(
        (s) => s._id === args.serviceId,
      );
    }

    if (workshopServices.length === 0) {
      return { upcoming: [], past: [] };
    }

    // Load all workshop projects in time range for batch matching
    let allProjects: Doc<"projects">[] = [];
    if (status !== "upcoming" || true) {
      // Always load projects to enrich slots that have registrations
      allProjects = await ctx.db
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

      // Also filter by serviceId / startTime on the project side
      if (args.serviceId) {
        allProjects = allProjects.filter((p) => p.service === args.serviceId);
      }
      if (args.startTime) {
        allProjects = allProjects.filter(
          (p) => p.bookingStartTime === args.startTime,
        );
      }
    }

    // Build a map from (serviceId:bookingStartTime) → projects
    const projectsByKey = new Map<string, Doc<"projects">[]>();
    for (const p of allProjects) {
      if (p.bookingStartTime == null) continue;
      const key = `${p.service}:${p.bookingStartTime}`;
      const existing = projectsByKey.get(key);
      if (existing) existing.push(p);
      else projectsByKey.set(key, [p]);
    }

    // ── Single pass: collect schedule event templates and unique
    //    resource / material IDs, filtered to the target date / time range.
    const allResourceIds = new Set<Id<"resources">>();
    const allMaterialIds = new Set<Id<"materials">>();

    interface EventTemplate {
      serviceId: Id<"services">;
      serviceName: string;
      serviceSlug: string;
      startTime: number;
      endTime: number;
      maxSlots: number;
      usedSlots: number;
      groupProjects: Doc<"projects">[];
      resourceIds: Id<"resources">[];
      materialIds: Id<"materials">[];
    }

    const eventTemplates: EventTemplate[] = [];

    for (const service of workshopServices) {
      const cat = service.serviceCategory;

      for (const schedule of cat.schedules) {
        // ── Date range filter ──────────────────────────────────────────
        if (minTime !== undefined && schedule.date + 86_400_000 < minTime)
          continue;
        if (maxTime !== undefined && schedule.date >= maxTime) continue;

        for (const timeSlot of schedule.timeSlots) {
          // ── Time range filter ───────────────────────────────────────
          if (minTime !== undefined && timeSlot.startTime < minTime) continue;
          if (maxTime !== undefined && timeSlot.startTime >= maxTime) continue;
          if (args.startTime && timeSlot.startTime !== args.startTime) continue;

          // Collect unique IDs while we have the schedule data open
          for (const rid of timeSlot.resources ?? []) allResourceIds.add(rid);
          for (const mid of timeSlot.availableMaterials ?? [])
            allMaterialIds.add(mid);

          const key = `${service._id}:${timeSlot.startTime}`;
          eventTemplates.push({
            serviceId: service._id,
            serviceName: service.name,
            serviceSlug: service.slug,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            maxSlots: timeSlot.maxSlots,
            usedSlots: timeSlot.usedUpSlots ?? 0,
            groupProjects: projectsByKey.get(key) ?? [],
            resourceIds: timeSlot.resources ?? [],
            materialIds: timeSlot.availableMaterials ?? [],
          });
        }
      }
    }

    // ── Batch-fetch resource & material details ────────────────────────
    const [resourceDocs, materialDocs] = await Promise.all([
      Promise.all(Array.from(allResourceIds).map((id) => ctx.db.get(id))),
      Promise.all(Array.from(allMaterialIds).map((id) => ctx.db.get(id))),
    ]);
    const resourceMap = new Map(
      resourceDocs
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => [d._id, { _id: d._id, name: d.name }]),
    );
    const materialMap = new Map(
      materialDocs
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => [d._id, { _id: d._id, name: d.name, unit: d.unit }]),
    );

    // ── Pre-fetch threads and user profiles for all active projects ─────
    const TERMINAL_STATUSES = new Set(["cancelled", "rejected"]);
    const allActiveProjects = allProjects.filter(
      (p) => !TERMINAL_STATUSES.has(p.status),
    );

    const threadDocs = await Promise.all(
      allActiveProjects.map((p) =>
        ctx.db
          .query("threads")
          .withIndex("projectId", (q) => q.eq("projectId", p._id))
          .first(),
      ),
    );
    const threadMap = new Map(
      threadDocs
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => [t.projectId!, t]),
    );

    const uniqueUserIds = Array.from(
      new Set(allActiveProjects.map((p) => p.userId)),
    );
    const userDocs = await Promise.all(
      uniqueUserIds.map((id) => ctx.db.get(id)),
    );
    const userMap = new Map(
      userDocs
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id, u]),
    );

    const uniqueProfilePics = Array.from(
      new Set(
        userDocs
          .filter(
            (u): u is NonNullable<typeof u> => u !== null && !!u.profilePic,
          )
          .map((u) => u!.profilePic!),
      ),
    );
    const urlPairs = await Promise.all(
      uniqueProfilePics.map(async (pic) => [
        pic,
        await ctx.storage.getUrl(pic),
      ]),
    );
    const urlMap = new Map(urlPairs as [Id<"_storage">, string | null][]);

    // ── Resolve templates into schedule events ──────────────────────────
    const scheduleEvents = eventTemplates.map((t) => {
      const activeProjects = t.groupProjects.filter(
        (p) => !TERMINAL_STATUSES.has(p.status),
      );

      const statusBreakdown: Record<string, number> = {};
      for (const p of t.groupProjects) {
        statusBreakdown[p.status] = (statusBreakdown[p.status] ?? 0) + 1;
      }

      const attendees = activeProjects
        .map((project) => {
          const profile = userMap.get(project.userId);
          if (!profile) return null;

          const thread = threadMap.get(project._id);
          return {
            projectId: project._id,
            userId: project.userId,
            name: profile.name,
            email: profile.email,
            status: project.status,
            pfpUrl: profile.profilePic
              ? (urlMap.get(profile.profilePic) ?? null)
              : null,
            createdAt: project._creationTime,
            roomId: thread?.roomId ?? null,
            threadId: thread?._id ?? null,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      const resolvedResources = Array.from(new Set(t.resourceIds))
        .map((rid) => resourceMap.get(rid))
        .filter((r): r is NonNullable<typeof r> => r !== undefined);

      const resolvedMaterials = Array.from(new Set(t.materialIds))
        .map((mid) => materialMap.get(mid))
        .filter((m): m is NonNullable<typeof m> => m !== undefined);

      return {
        serviceId: t.serviceId,
        serviceName: t.serviceName,
        serviceSlug: t.serviceSlug,
        date: getLabDayStartTimestamp(t.startTime),
        startTime: t.startTime,
        endTime: t.endTime,
        maxSlots: t.maxSlots,
        usedSlots: t.usedSlots,
        registrationCount: activeProjects.length,
        cancelledCount: t.groupProjects.length - activeProjects.length,
        statusBreakdown,
        resources: resolvedResources.length > 0 ? resolvedResources : undefined,
        availableMaterials:
          resolvedMaterials.length > 0 ? resolvedMaterials : undefined,
        attendees,
      };
    });

    // ── Sort and split into upcoming / past ──────────────────────────────
    const upcoming = scheduleEvents
      .filter((e) => e.startTime >= todayStart)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 50);

    const past = scheduleEvents
      .filter((e) => e.startTime < todayStart)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 50);

    return { upcoming, past };
  },
});
