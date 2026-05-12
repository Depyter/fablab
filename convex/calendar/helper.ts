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

export type CalendarBookingRange = {
  startTime: number;
  endTime: number;
};

function isPrivilegedRole(role: CalendarRole) {
  return role === "admin" || role === "maker";
}

function canSeeCalendarUsageDetails(args: {
  role: CalendarRole;
  ownedProjectIds: Set<Id<"projects">>;
  projectId: Id<"projects">;
}) {
  return args.role !== "client" || args.ownedProjectIds.has(args.projectId);
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
  if (ctx.profile.role !== "client") {
    return new Set<Id<"projects">>();
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_userProfile", (q) => q.eq("userId", ctx.profile._id))
    .collect();

  return new Set(projects.map((project) => project._id));
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
  const [usages, ownedProjectIds] = await Promise.all([
    loadCandidateUsages(ctx, range),
    loadOwnedProjectIds(ctx),
  ]);
  const visibleProjectIds = collectVisibleProjectIds({
    role: ctx.profile.role,
    ownedProjectIds,
    usages,
  });
  const { projectById, clientById } = await loadCalendarBookingHydration(
    ctx,
    visibleProjectIds,
  );

  return usages.map((usage) =>
    mapCalendarBookingItem({
      role: ctx.profile.role,
      ownedProjectIds,
      usage,
      projectById,
      clientById,
    }),
  );
}

async function loadCandidateServiceProjects(
  ctx: CalendarQueryContext,
  range: CalendarBookingRange,
) {
  const ownedProjectIds = await loadOwnedProjectIds(ctx);
  const isPrivileged = isPrivilegedRole(ctx.profile.role);

  const candidateProjects = await ctx.db
    .query("projects")
    .withIndex("by_bookingStartTime", (q) =>
      q
        .gte("bookingStartTime", range.startTime)
        .lt("bookingStartTime", range.endTime),
    )
    .collect();

  // Apply access filter
  const visibleProjects = candidateProjects.filter((project) => {
    if (isPrivileged) return true;
    return ownedProjectIds.has(project._id);
  });

  return visibleProjects;
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

  return projects.map((project) =>
    mapServiceBookingItem({
      role: ctx.profile.role,
      project,
      client: clientById.get(project.userId),
    }),
  );
}
