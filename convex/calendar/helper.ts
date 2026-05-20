import { ProjectStatus, UserRole } from "../constants";
import type {
  CalendarBookingItem,
  CalendarFrameData,
} from "../../src/lib/calendar";
import { overlapsTimeRange } from "../../src/lib/time-range";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type CalendarRole = Doc<"userProfile">["role"];
type CalendarQueryContext = {
  db: QueryCtx["db"];
  profile: Pick<Doc<"userProfile">, "_id" | "role">;
};

/**
 * Prefix used for synthetic calendar items that represent available
 * (unbooked) workshop time slots. View-models use this to distinguish
 * placeholders from real bookings.
 */
export const AVAILABLE_WORKSHOP_ID_PREFIX = "available-ws-";

export type CalendarBookingRange = {
  startTime: number;
  endTime: number;
};

function isPrivilegedRole(role: CalendarRole) {
  return role === UserRole.ADMIN || role === UserRole.MAKER;
}

/**
 * Load available workshop time slots from WORKSHOP-type services and return
 * placeholder CalendarBookingItems for any slots that still have capacity.
 * Only returns results for admin/maker roles.
 */
async function loadAvailableWorkshopSlots(
  ctx: CalendarQueryContext,
  range: CalendarBookingRange,
): Promise<{
  services: CalendarBookingItem[];
  resources: CalendarBookingItem[];
}> {
  if (!isPrivilegedRole(ctx.profile.role)) {
    return { services: [], resources: [] };
  }

  const allServices = await ctx.db.query("services").collect();
  const services: CalendarBookingItem[] = [];
  const resources: CalendarBookingItem[] = [];

  for (const service of allServices) {
    if (service.serviceCategory.type !== "WORKSHOP") continue;

    for (const schedule of service.serviceCategory.schedules) {
      for (const timeSlot of schedule.timeSlots) {
        if (
          timeSlot.startTime < range.startTime ||
          timeSlot.startTime >= range.endTime ||
          timeSlot.startTime < Date.now()
        ) {
          continue;
        }

        const usedSlots = timeSlot.usedUpSlots ?? 0;
        const remainingSlots = timeSlot.maxSlots - usedSlots;

        const label =
          remainingSlots <= 0
            ? "Full"
            : `${remainingSlots} slot${remainingSlots > 1 ? "s" : ""} available`;

        // Services tab: one placeholder per time slot
        services.push({
          _id: `available-ws-${service._id}-${timeSlot.startTime}`,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          projectId: null,
          projectAlias: service.name,
          projectStatus: "approved",
          clientName: label,
          serviceId: service._id,
          resourceId: null,
        });

        // Resources tab: one placeholder per resource on the time slot
        for (const resourceId of timeSlot.resources ?? []) {
          resources.push({
            _id: `available-ws-${service._id}-${resourceId}-${timeSlot.startTime}`,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            projectId: null,
            projectAlias: service.name,
            projectStatus: "approved",
            clientName: label,
            serviceId: service._id,
            resourceId,
          });
        }
      }
    }
  }

  return { services, resources };
}

function canSeeCalendarUsageDetails(args: {
  role: CalendarRole;
  ownedProjectIds: Set<Id<"projects">>;
  projectId: Id<"projects">;
}) {
  return (
    args.role !== UserRole.CLIENT || args.ownedProjectIds.has(args.projectId)
  );
}

function mapCalendarFrameService(service: Doc<"services">) {
  return {
    _id: service._id,
    name: service.name,
    slug: service.slug,
    status: service.status,
    serviceCategoryType: service.serviceCategory.type,
  };
}

function mapCalendarFrameResource(resource: Doc<"resources">) {
  return {
    _id: resource._id,
    name: resource.name,
    category: resource.category,
    description: resource.description,
    status: resource.status,
  };
}

export async function loadCalendarFrame(
  ctx: CalendarQueryContext,
): Promise<CalendarFrameData & { role: CalendarRole }> {
  const isPrivileged = isPrivilegedRole(ctx.profile.role);
  const [services, resources] = await Promise.all([
    ctx.db.query("services").collect(),
    isPrivileged ? ctx.db.query("resources").collect() : Promise.resolve([]),
  ]);

  return {
    role: ctx.profile.role,
    services: services.map(mapCalendarFrameService),
    resources: resources.map(mapCalendarFrameResource),
  };
}

async function loadCandidateUsages(
  ctx: CalendarQueryContext,
  range: CalendarBookingRange,
) {
  const candidateUsages = await ctx.db
    .query("resourceUsage")
    .withIndex("by_endTime", (q) => q.gt("endTime", range.startTime))
    .collect();

  return candidateUsages.filter((usage) =>
    overlapsTimeRange(
      usage.startTime,
      usage.endTime,
      range.startTime,
      range.endTime,
    ),
  );
}

async function loadOwnedProjectIds(ctx: CalendarQueryContext) {
  if (ctx.profile.role === UserRole.CLIENT) {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userProfile", (q) => q.eq("userId", ctx.profile._id))
      .collect();

    return new Set(projects.map((project) => project._id));
  }

  if (ctx.profile.role === UserRole.MAKER) {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_assignedMaker", (q) =>
        q.eq("assignedMaker", ctx.profile._id),
      )
      .collect();

    return new Set(projects.map((project) => project._id));
  }

  // Admin sees everything — return empty set so canSeeCalendarUsageDetails
  // treats all bookings as visible.
  return new Set<Id<"projects">>();
}

function collectVisibleProjectIds(args: {
  role: CalendarRole;
  ownedProjectIds: Set<Id<"projects">>;
  usages: Doc<"resourceUsage">[];
}) {
  return new Set(
    args.usages
      .filter((usage) =>
        canSeeCalendarUsageDetails({
          role: args.role,
          ownedProjectIds: args.ownedProjectIds,
          projectId: usage.projectId,
        }),
      )
      .map((usage) => usage.projectId),
  );
}

async function loadProjectsById(
  ctx: CalendarQueryContext,
  projectIds: Set<Id<"projects">>,
) {
  const projectDocs = await Promise.all(
    Array.from(projectIds).map((projectId) => ctx.db.get(projectId)),
  );

  return new Map(
    projectDocs
      .filter(
        (project): project is NonNullable<typeof project> => project !== null,
      )
      .map((project) => [project._id, project]),
  );
}

async function loadClientsById(
  ctx: CalendarQueryContext,
  clientIds: Set<Id<"userProfile">>,
) {
  const clientDocs = await Promise.all(
    Array.from(clientIds).map((clientId) => ctx.db.get(clientId)),
  );

  return new Map(
    clientDocs
      .filter((client): client is NonNullable<typeof client> => client !== null)
      .map((client) => [client._id, client]),
  );
}

async function loadCalendarBookingHydration(
  ctx: CalendarQueryContext,
  projectIds: Set<Id<"projects">>,
) {
  const projectById = await loadProjectsById(ctx, projectIds);
  const clientIds = new Set(
    Array.from(projectById.values()).map((project) => project.userId),
  );
  const clientById = await loadClientsById(ctx, clientIds);

  return { projectById, clientById };
}

function mapCalendarBookingItem(args: {
  role: CalendarRole;
  ownedProjectIds: Set<Id<"projects">>;
  usage: Doc<"resourceUsage">;
  projectById: Map<Id<"projects">, Doc<"projects">>;
  clientById: Map<Id<"userProfile">, Doc<"userProfile">>;
}): CalendarBookingItem {
  const canSeeDetails = canSeeCalendarUsageDetails({
    role: args.role,
    ownedProjectIds: args.ownedProjectIds,
    projectId: args.usage.projectId,
  });
  const project = canSeeDetails
    ? args.projectById.get(args.usage.projectId)
    : null;
  const client =
    canSeeDetails && project ? args.clientById.get(project.userId) : null;

  return {
    _id: args.usage._id,
    startTime: args.usage.startTime,
    endTime: args.usage.endTime,
    projectId: canSeeDetails ? args.usage.projectId : null,
    projectAlias: canSeeDetails
      ? project?.name || "Unknown Project"
      : "Reserved Slot",
    projectStatus: project?.status || "pending",
    clientName: canSeeDetails
      ? client?.name || "Unknown Client"
      : "Reserved Slot",
    serviceId: args.usage.service,
    resourceId: args.usage.resource || null,
  };
}

export async function loadCalendarBookings(
  ctx: CalendarQueryContext,
  range: CalendarBookingRange,
): Promise<CalendarBookingItem[]> {
  const [usages, ownedProjectIds, allServices] = await Promise.all([
    loadCandidateUsages(ctx, range),
    loadOwnedProjectIds(ctx),
    ctx.db.query("services").collect(),
  ]);

  // Build a service-type map so we can skip individual workshop resource
  // usage records — workshop resources are rendered from schedule slots
  // via loadAvailableWorkshopSlots instead.
  const isWorkshopService = new Map<Id<"services">, boolean>();
  for (const s of allServices) {
    isWorkshopService.set(s._id, s.serviceCategory.type === "WORKSHOP");
  }

  // Filter out individual resourceUsage records that belong to workshop
  // services — they are replaced by schedule-based slot entries below.
  const nonWorkshopUsages = usages.filter((u) => {
    const isWs = isWorkshopService.get(u.service);
    return !isWs;
  });

  const visibleProjectIds = collectVisibleProjectIds({
    role: ctx.profile.role,
    ownedProjectIds,
    usages: nonWorkshopUsages,
  });
  const { projectById, clientById } = await loadCalendarBookingHydration(
    ctx,
    visibleProjectIds,
  );

  const items = nonWorkshopUsages.map((usage) =>
    mapCalendarBookingItem({
      role: ctx.profile.role,
      ownedProjectIds,
      usage,
      projectById,
      clientById,
    }),
  );

  // Append schedule-based workshop resource slots so resources appear
  // as a single generic block per time slot (matching the services-tab
  // pattern) rather than one block per project registration.
  const available = await loadAvailableWorkshopSlots(ctx, range);
  items.push(...available.resources);

  return items;
}

async function loadCandidateServiceProjects(
  ctx: CalendarQueryContext,
  range: CalendarBookingRange,
) {
  const ownedProjectIds = await loadOwnedProjectIds(ctx);

  const candidateProjects = await ctx.db
    .query("projects")
    .withIndex("by_bookingStartTime", (q) =>
      q
        .gte("bookingStartTime", range.startTime)
        .lt("bookingStartTime", range.endTime),
    )
    .collect();

  // Apply access filter:
  //   - Admin  → full access (sees all)
  //   - Maker  → only assigned projects (via ownedProjectIds)
  //   - Client → only own projects (via ownedProjectIds)
  const visibleProjects = candidateProjects.filter((project) => {
    if (ctx.profile.role === UserRole.ADMIN) return true;
    return ownedProjectIds.has(project._id);
  });

  // Exclude rejected / cancelled projects so they don't appear to occupy
  // a time slot on the calendar. Their resourceUsage records are already
  // deleted by applyStatusChange.
  const activeProjects = visibleProjects.filter(
    (project) =>
      project.status !== ProjectStatus.REJECTED &&
      project.status !== ProjectStatus.CANCELLED,
  );

  return activeProjects;
}

function mapServiceBookingItem(args: {
  role: CalendarRole;
  project: Doc<"projects">;
  client: Doc<"userProfile"> | undefined;
}): CalendarBookingItem {
  return {
    _id: args.project._id,
    startTime: args.project.bookingStartTime ?? 0,
    endTime: args.project.bookingEndTime ?? args.project.bookingStartTime ?? 0,
    projectId: args.project._id,
    projectAlias: args.project.name,
    projectStatus: args.project.status,
    clientName: args.client?.name ?? "Unknown Client",
    serviceId: args.project.service,
    resourceId: null,
  };
}

export async function loadServiceCalendarBookings(
  ctx: CalendarQueryContext,
  range: CalendarBookingRange,
): Promise<CalendarBookingItem[]> {
  const projects = await loadCandidateServiceProjects(ctx, range);

  // Load client profiles for all visible projects
  const clientIds = new Set(projects.map((p) => p.userId));
  const clientById = await loadClientsById(ctx, clientIds);

  const items = projects.map((project) =>
    mapServiceBookingItem({
      role: ctx.profile.role,
      project,
      client: clientById.get(project.userId),
    }),
  );

  // Append available (unbooked) workshop time slots so they appear
  // in the calendar even when no one has registered yet.
  const available = await loadAvailableWorkshopSlots(ctx, range);
  items.push(...available.services);

  return items;
}
