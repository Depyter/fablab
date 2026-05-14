import { ConvexError } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { derivePricingFromSchema } from "../../src/lib/project-pricing";
import {
  formatLabDate,
  formatLabTime,
  getCurrentTimestamp,
  getLabWeekday,
} from "../../src/lib/lab-time";
import {
  FILE_CATEGORIES,
  MaterialStatus,
  PROJECT_ARCHIVE_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TRANSITIONS,
  UserRole,
  type MaterialStatusType,
  type ProjectStatusType,
} from "../constants";

/**
 * Builds the denormalized search text for a project.
 * Concatenates name, description, and notes so the search index covers all free-text fields.
 */
export function buildSearchText(fields: {
  name: string;
  description: string;
  notes: string;
}): string {
  return [fields.name, fields.description, fields.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export type ProjectStatus = ProjectStatusType;

// ============================================================================
// Types
// ============================================================================

export type BookingWindow = {
  startTime: number;
  endTime: number;
  date: number; // Local day-start timestamp — used for workshop schedule matching
};

export type ServiceDoc = Doc<"services">;
export type ProjectPricingSnapshot = {
  setupFee: number;
  timeCost: number;
  materialCost: number;
  total: number;
  duration: number;
  rate: number;
  unitName: string;
};

export type UsagePricingSnapshot = {
  duration: number;
  rate: number;
  timeCost: number;
  materialCost: number;
  setupFeePortion: number;
  subtotal: number;
  unitName: string;
  pricingVariant?: string;
};

export function resolveMaterialStatus(
  stock: number,
  reorderThreshold?: number,
): MaterialStatusType {
  if (stock === 0) {
    return MaterialStatus.OUT_OF_STOCK;
  }

  if (reorderThreshold !== undefined && stock <= reorderThreshold) {
    return MaterialStatus.LOW_STOCK;
  }

  return MaterialStatus.IN_STOCK;
}

// ============================================================================
// Helpers — Validation
// ============================================================================

export async function resolveService(
  ctx: MutationCtx,
  serviceId: Id<"services">,
): Promise<ServiceDoc> {
  const service = await ctx.db.get(serviceId);
  if (!service) throw new ConvexError("Service not found!");
  if (service.status !== "Available") {
    throw new ConvexError("Service is currently unavailable for booking.");
  }
  return service;
}

export async function validateFileTypes(
  ctx: MutationCtx,
  files: Id<"_storage">[],
  service: ServiceDoc,
): Promise<void> {
  if (!files.length || !service.fileTypes?.length) return;

  const allowedMimes = service.fileTypes.flatMap(
    (cat) => FILE_CATEGORIES[cat] || [cat],
  );

  for (const fileId of files) {
    const fileDoc = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", fileId))
      .first();

    if (fileDoc && !allowedMimes.includes(fileDoc.type)) {
      throw new ConvexError(
        `File type "${fileDoc.type}" is not allowed for this service.`,
      );
    }
  }
}

// ============================================================================
// Helpers — Booking Resolution
// ============================================================================

export function validateBookingTiming(
  booking: BookingWindow,
  options?: { allowPastBooking?: boolean },
): void {
  const now = getCurrentTimestamp();
  if (!options?.allowPastBooking && booking.startTime < now) {
    throw new ConvexError("Cannot book a date or time in the past.");
  }
  if (booking.endTime <= booking.startTime) {
    throw new ConvexError("End time must be after start time.");
  }
}

export async function validateFabricationAvailability(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  service: ServiceDoc,
  booking: BookingWindow,
  options?: {
    resourceId?: Id<"resources"> | null;
    excludeUsageId?: Id<"resourceUsage">;
  },
): Promise<void> {
  if (service.serviceCategory.type !== "FABRICATION") return;

  // Day-of-week check
  if (service.serviceCategory.availableDays?.length) {
    const dayOfWeek = getLabWeekday(booking.date);
    if (!service.serviceCategory.availableDays.includes(dayOfWeek)) {
      throw new ConvexError(
        "Selected date falls on an unavailable day for this service.",
      );
    }
  }

  // Conflict check — prefer resource timelines when the service has discrete
  // resources, otherwise fall back to the pooled service timeline.
  const existingUsages = options?.resourceId
    ? await ctx.db
        .query("resourceUsage")
        .withIndex("by_resource_startTime", (q) =>
          q.eq("resource", options.resourceId!),
        )
        .collect()
    : await ctx.db
        .query("resourceUsage")
        .withIndex("by_service", (q) => q.eq("service", serviceId))
        .collect();

  for (const usage of existingUsages) {
    if (options?.excludeUsageId && usage._id === options.excludeUsageId) {
      continue;
    }
    if (
      booking.startTime < usage.endTime &&
      booking.endTime > usage.startTime
    ) {
      throw new ConvexError("This timeslot is already booked.");
    }
  }
}

export function computeProvisionalCostBreakdown(
  service: ServiceDoc,
  pricingVariant: string,
  fulfillmentMode: string,
  bookingDurationMs: number,
): ProjectPricingSnapshot {
  const breakdown = derivePricingFromSchema({
    servicePricing: service.serviceCategory,
    pricingVariant,
    serviceType: fulfillmentMode as "self-service" | "full-service",
    bookingDurationMinutes: bookingDurationMs / (1000 * 60),
  });

  return {
    setupFee: breakdown.setupFee,
    materialCost: 0,
    timeCost: breakdown.timeCost,
    total: breakdown.total,
    duration: breakdown.duration,
    rate: breakdown.rate,
    unitName: breakdown.unitName,
  };
}

export function buildTotalInvoice(total: number) {
  return {
    subtotal: total,
    tax: 0,
    total,
  };
}

export function buildPricingSnapshot(
  snapshot: Omit<ProjectPricingSnapshot, "total">,
) {
  return {
    ...snapshot,
    total: snapshot.setupFee + snapshot.timeCost + snapshot.materialCost,
  };
}

export function buildUsagePricingSnapshot(
  snapshot: Omit<UsagePricingSnapshot, "subtotal">,
): UsagePricingSnapshot {
  return {
    ...snapshot,
    subtotal:
      snapshot.setupFeePortion + snapshot.timeCost + snapshot.materialCost,
  };
}

function sortProjectUsages(usages: Doc<"resourceUsage">[]) {
  return [...usages].sort(
    (a, b) =>
      a.startTime - b.startTime ||
      a._creationTime - b._creationTime ||
      a._id.localeCompare(b._id),
  );
}

function getUsageDurationMs(usage: Doc<"resourceUsage">) {
  return Math.max(0, usage.endTime - usage.startTime);
}

function getUsageMaterialCost(usage: Doc<"resourceUsage">) {
  return (
    usage.materialsUsed?.reduce(
      (sum, material) =>
        sum + material.amountUsed * (material.snapshot?.pricePerUnit ?? 0),
      0,
    ) ?? 0
  );
}

function deriveProjectPricingSnapshot(
  usagePricingSnapshots: UsagePricingSnapshot[],
  fallbackUnitName: string,
): ProjectPricingSnapshot {
  const setupFee = usagePricingSnapshots.reduce(
    (sum, usage) => sum + usage.setupFeePortion,
    0,
  );
  const timeCost = usagePricingSnapshots.reduce(
    (sum, usage) => sum + usage.timeCost,
    0,
  );
  const materialCost = usagePricingSnapshots.reduce(
    (sum, usage) => sum + usage.materialCost,
    0,
  );
  const duration = usagePricingSnapshots.reduce(
    (sum, usage) => sum + usage.duration,
    0,
  );
  const unitName = usagePricingSnapshots[0]?.unitName ?? fallbackUnitName;
  const rate =
    duration > 0
      ? timeCost / duration
      : (usagePricingSnapshots.find((usage) => usage.rate > 0)?.rate ?? 0);

  return buildPricingSnapshot({
    setupFee,
    timeCost,
    materialCost,
    duration,
    rate,
    unitName,
  });
}

function usagePricingSnapshotEquals(
  left: UsagePricingSnapshot | undefined,
  right: UsagePricingSnapshot,
) {
  if (!left) return false;

  return (
    Math.abs(left.duration - right.duration) <= 0.0001 &&
    Math.abs(left.rate - right.rate) <= 0.0001 &&
    Math.abs(left.timeCost - right.timeCost) <= 0.0001 &&
    Math.abs(left.materialCost - right.materialCost) <= 0.0001 &&
    Math.abs(left.setupFeePortion - right.setupFeePortion) <= 0.0001 &&
    Math.abs(left.subtotal - right.subtotal) <= 0.0001 &&
    left.unitName === right.unitName &&
    left.pricingVariant === right.pricingVariant
  );
}

function deriveUsagePricingSnapshot(
  project: Doc<"projects">,
  service: ServiceDoc,
  usage: Doc<"resourceUsage">,
  index: number,
): UsagePricingSnapshot {
  if (service.serviceCategory.type === "WORKSHOP") {
    const sessionPrice = derivePricingFromSchema({
      servicePricing: service.serviceCategory,
      pricingVariant: project.pricing,
      serviceType: project.fulfillmentMode,
      materialCost: getUsageMaterialCost(usage),
    });

    return buildUsagePricingSnapshot({
      duration: sessionPrice.duration,
      rate: sessionPrice.rate,
      timeCost: sessionPrice.timeCost,
      materialCost: sessionPrice.materialCost,
      setupFeePortion: sessionPrice.setupFee,
      unitName: sessionPrice.unitName,
      pricingVariant: project.pricing,
    });
  }

  const usagePricing = derivePricingFromSchema({
    servicePricing: service.serviceCategory,
    pricingVariant: project.pricing,
    serviceType: project.fulfillmentMode,
    bookingDurationMinutes: getUsageDurationMs(usage) / (1000 * 60),
    materialCost: getUsageMaterialCost(usage),
  });
  const setupFee = derivePricingFromSchema({
    servicePricing: service.serviceCategory,
    pricingVariant: project.pricing,
    serviceType: project.fulfillmentMode,
    bookingDurationMinutes: 0,
  }).setupFee;

  return buildUsagePricingSnapshot({
    duration: usagePricing.duration,
    rate: usagePricing.rate,
    timeCost: usagePricing.timeCost,
    materialCost: usagePricing.materialCost,
    setupFeePortion: index === 0 ? setupFee : 0,
    unitName: usagePricing.unitName,
    pricingVariant: project.pricing,
  });
}

// ============================================================================
// Helpers — Resource Usage
// ============================================================================

export function buildMaterialSnapshot(material: Doc<"materials">) {
  return {
    name: material.name,
    unit: material.unit,
    pricePerUnit: material.pricePerUnit,
    costPerUnit: material.costPerUnit,
  };
}

export async function createWorkshopUsage(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  service: ServiceDoc,
  booking: BookingWindow,
  projectId: Id<"projects">,
  snapshot: { name: string; costAtTime: number; unit: string },
  pricingSnapshot: UsagePricingSnapshot,
  initialMaterialIds?: Id<"materials">[],
): Promise<Id<"resourceUsage">> {
  // Capacity check against the schedule time slot
  if (service.serviceCategory.type === "WORKSHOP") {
    const schedule = service.serviceCategory.schedules.find(
      (s) => s.date === booking.date,
    );
    const timeSlot = schedule?.timeSlots.find(
      (t) => t.startTime === booking.startTime,
    );
    if (
      timeSlot &&
      timeSlot.maxSlots > 0 &&
      (timeSlot.usedUpSlots ?? 0) >= timeSlot.maxSlots
    ) {
      throw new ConvexError("This workshop timeslot is fully booked.");
    }
  }

  const materialsUsed =
    initialMaterialIds && initialMaterialIds.length > 0
      ? await buildMaterialEntries(ctx, initialMaterialIds)
      : undefined;

  return ctx.db.insert("resourceUsage", {
    projectId,
    service: serviceId,
    startTime: booking.startTime,
    endTime: booking.endTime,
    snapshot,
    pricingSnapshot,
    materialsUsed,
  });
}

export async function createFabricationUsage(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  booking: BookingWindow,
  projectId: Id<"projects">,
  snapshot: { name: string; costAtTime: number; unit: string },
  pricingSnapshot: UsagePricingSnapshot,
  initialMaterialIds?: Id<"materials">[],
): Promise<Id<"resourceUsage">> {
  const materialsUsed =
    initialMaterialIds && initialMaterialIds.length > 0
      ? await buildMaterialEntries(ctx, initialMaterialIds)
      : undefined;

  return ctx.db.insert("resourceUsage", {
    projectId,
    service: serviceId,
    startTime: booking.startTime,
    endTime: booking.endTime,
    snapshot,
    pricingSnapshot,
    materialsUsed,
  });
}

async function buildMaterialEntries(
  ctx: MutationCtx,
  materialIds: Id<"materials">[],
) {
  return Promise.all(
    materialIds.map(async (materialId) => {
      const mat = await ctx.db.get(materialId);
      return {
        materialId,
        amountUsed: 0,
        snapshot: mat ? buildMaterialSnapshot(mat) : undefined,
      };
    }),
  );
}

export async function incrementWorkshopSlot(
  ctx: MutationCtx,
  service: ServiceDoc,
  booking: BookingWindow,
): Promise<void> {
  if (service.serviceCategory.type !== "WORKSHOP") return;

  const updatedSchedules = service.serviceCategory.schedules.map((s) => {
    if (s.date !== booking.date) return s;
    return {
      ...s,
      timeSlots: s.timeSlots.map((t) => {
        if (t.startTime !== booking.startTime) return t;
        return { ...t, usedUpSlots: (t.usedUpSlots || 0) + 1 };
      }),
    };
  });

  await ctx.db.patch(service._id, {
    serviceCategory: {
      ...service.serviceCategory,
      schedules: updatedSchedules,
    },
  });
}

export async function decrementWorkshopSlot(
  ctx: MutationCtx,
  service: ServiceDoc,
  usage: Doc<"resourceUsage">,
): Promise<void> {
  if (service.serviceCategory.type !== "WORKSHOP") return;

  const slotStartTime = usage.startTime;

  // Match schedule by finding the one that owns this time slot
  const updatedSchedules = service.serviceCategory.schedules.map((s) => {
    const hasSlot = s.timeSlots.some((t) => t.startTime === slotStartTime);
    if (!hasSlot) return s;
    return {
      ...s,
      timeSlots: s.timeSlots.map((t) => {
        if (t.startTime !== slotStartTime) return t;
        return { ...t, usedUpSlots: Math.max(0, (t.usedUpSlots || 0) - 1) };
      }),
    };
  });

  await ctx.db.patch(service._id, {
    serviceCategory: {
      ...service.serviceCategory,
      schedules: updatedSchedules,
    },
  });
}

// ============================================================================
// Helpers — Messaging / Room
// ============================================================================

export async function ensureProjectRoom(
  ctx: MutationCtx,
  userProfile: Doc<"userProfile">,
): Promise<Id<"rooms">> {
  const existingRoom = await ctx.db
    .query("rooms")
    .withIndex("by_creator", (q) => q.eq("creator", userProfile._id))
    .filter((q) => q.eq(q.field("createdVia"), "Project"))
    .first();

  if (existingRoom) return existingRoom._id;

  const workspaceName = `${userProfile.name}`;
  const roomId = await ctx.db.insert("rooms", {
    name: workspaceName,
    color: "yellow",
    creator: userProfile._id,
    createdVia: "Project",
  });

  await ctx.db.insert("roomMembers", {
    roomId,
    participantId: userProfile._id,
  });

  const admins = await ctx.db
    .query("userProfile")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();

  for (const admin of admins) {
    if (admin._id !== userProfile._id) {
      await ctx.db.insert("roomMembers", {
        roomId,
        participantId: admin._id,
      });
    }
  }

  const welcomeContent = `Welcome to ${workspaceName}! This is your main room for general inquiries.`;
  const generalThreadId = await ctx.db.insert("threads", {
    roomId,
    title: "General",
    createdBy: userProfile._id,
    archived: "Active",
    lastMessageText: welcomeContent,
    lastMessageAt: getCurrentTimestamp(),
    messageCount: 1,
  });

  await ctx.db.insert("messages", {
    room: roomId,
    threadId: generalThreadId,
    content: welcomeContent,
    sender: "System",
  });

  return roomId;
}

export async function createProjectThread(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  projectId: Id<"projects">,
  userProfile: Doc<"userProfile">,
  service: ServiceDoc,
  args: {
    name: string;
    description: string;
    type: string;
    fulfillmentMode: string;
    material: string;
    pricing: string;
    notes: string;
    files?: Id<"_storage">[];
  },
  booking: BookingWindow,
  now: number,
): Promise<Id<"threads">> {
  const bookingDateStr = formatLabDate(booking.date, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startTimeStr = formatLabTime(booking.startTime);
  const endTimeStr = formatLabTime(booking.endTime);

  const messageContent = [
    `New project created: ${args.name}`,
    ``,
    `Service: ${service.name}`,
    `Description: ${args.description}`,
    `Type: ${args.type}`,
    `Fulfillment: ${args.fulfillmentMode}`,
    `Material: ${args.material}`,
    `Pricing: ${args.pricing}`,
    `Notes: ${args.notes}`,
    `Booking: ${bookingDateStr} from ${startTimeStr} to ${endTimeStr} (PST)`,
  ].join("\n");

  const threadId = await ctx.db.insert("threads", {
    roomId,
    projectId,
    title: args.name,
    createdBy: userProfile._id,
    archived: "Active",
    lastMessageText: messageContent,
    lastMessageAt: now,
    messageCount: 1,
  });

  await ctx.db.insert("messages", {
    room: roomId,
    threadId,
    content: messageContent,
    sender: "System",
    file: args.files,
  });

  await ctx.db.patch(roomId, {
    lastMessageText: messageContent,
    lastMessageAt: now,
  });

  return threadId;
}

// ============================================================================
// Helpers — Project Updates
// ============================================================================

export async function syncProjectTotalInvoice(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  options?: {
    fallbackTotal?: number;
    preferStoredUsageSnapshots?: boolean;
  },
): Promise<number | undefined> {
  const project = await ctx.db.get(projectId);
  if (!project) return options?.fallbackTotal;

  const service = await ctx.db.get(project.service);

  const usageDocs = await ctx.db
    .query("resourceUsage")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const usages = sortProjectUsages(usageDocs);

  const fallbackTotal = options?.fallbackTotal;

  if (!service || usages.length === 0) {
    await ctx.db.patch(projectId, {
      totalInvoice:
        fallbackTotal !== undefined
          ? buildTotalInvoice(fallbackTotal)
          : undefined,
      pricingSnapshot: undefined,
    });
    return fallbackTotal;
  }

  const usagePricingSnapshots = usages.map((usage, index) =>
    options?.preferStoredUsageSnapshots && usage.pricingSnapshot
      ? usage.pricingSnapshot
      : deriveUsagePricingSnapshot(project, service, usage, index),
  );

  await Promise.all(
    usages.map(async (usage, index) => {
      const nextPricingSnapshot = usagePricingSnapshots[index];
      const subtotalMatches =
        Math.abs(usage.snapshot.costAtTime - nextPricingSnapshot.subtotal) <=
        0.0001;
      const pricingSnapshotMatches = usagePricingSnapshotEquals(
        usage.pricingSnapshot,
        nextPricingSnapshot,
      );

      if (subtotalMatches && pricingSnapshotMatches) return;
      await ctx.db.patch(usage._id, {
        snapshot: {
          ...usage.snapshot,
          costAtTime: nextPricingSnapshot.subtotal,
        },
        pricingSnapshot: nextPricingSnapshot,
      });
    }),
  );

  const total = usagePricingSnapshots.reduce(
    (sum, usagePricing) => sum + usagePricing.subtotal,
    0,
  );
  const pricingSnapshot = deriveProjectPricingSnapshot(
    usagePricingSnapshots,
    service.serviceCategory.type === "FABRICATION"
      ? service.serviceCategory.unitName
      : "unit",
  );

  await ctx.db.patch(projectId, {
    totalInvoice: buildTotalInvoice(total),
    pricingSnapshot,
  });

  return total;
}

/**
 * Sends a system message into the project's thread.
 * Lines should already be formatted (markdown supported).
 */
export async function sendProjectSystemMessage(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  lines: string[],
): Promise<void> {
  if (lines.length === 0) return;
  const thread = await ctx.db
    .query("threads")
    .withIndex("projectId", (q) => q.eq("projectId", projectId))
    .first();
  if (!thread) return;
  const content = lines.join("\n");
  const now = getCurrentTimestamp();
  await ctx.db.insert("messages", {
    room: thread.roomId,
    threadId: thread._id,
    content,
    sender: "System",
  });
  await Promise.all([
    ctx.db.patch(thread._id, {
      lastMessageText: content,
      lastMessageAt: now,
      messageCount: (thread.messageCount ?? 0) + 1,
    }),
    ctx.db.patch(thread.roomId, {
      lastMessageText: content,
      lastMessageAt: now,
    }),
  ]);
}

/**
 * Applies a status change to the project and handles workshop slot
 * release when the project is cancelled or rejected.
 * Returns change-log lines for the system message.
 */
export async function applyStatusChange(
  ctx: MutationCtx,
  project: Doc<"projects">,
  existingProject: Doc<"projects">,
  status: ProjectStatus,
): Promise<string[]> {
  if (project.status === status) return [];

  if (!PROJECT_STATUS_TRANSITIONS[project.status].includes(status)) {
    throw new ConvexError(
      `Cannot change project status from ${project.status} to ${status}.`,
    );
  }

  await ctx.db.patch(project._id, { status });

  const lines: string[] = [
    `Status updated to: **${PROJECT_STATUS_LABELS[status]}**`,
  ];

  // Release bookings, workshop slots, and any reserved materials on
  // cancellation / rejection so the project no longer holds resources.
  if (
    (status === "cancelled" || status === "rejected") &&
    existingProject.status !== "cancelled" &&
    existingProject.status !== "rejected"
  ) {
    const service = await ctx.db.get(project.service);
    const usages = await ctx.db
      .query("resourceUsage")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    for (const usage of usages) {
      if (service && service.serviceCategory.type === "WORKSHOP") {
        await decrementWorkshopSlot(ctx, service, usage);
      }

      for (const material of usage.materialsUsed ?? []) {
        if (material.amountUsed > 0) {
          await syncMaterialUsageStock(
            ctx,
            material.materialId,
            material.amountUsed,
            0,
          );
        }
      }

      await ctx.db.delete(usage._id);
    }

    await syncProjectTotalInvoice(ctx, project._id);
  }

  // ── Unschedule / schedule on terminal status transitions ──────────────
  const wasArchiveStatus = PROJECT_ARCHIVE_STATUSES.includes(
    existingProject.status as ProjectStatusType,
  );
  const isArchiveStatus = PROJECT_ARCHIVE_STATUSES.includes(
    status as ProjectStatusType,
  );

  if (wasArchiveStatus && !isArchiveStatus) {
    // Project left a terminal state — clear the scheduled deadline
    await ctx.db.patch(project._id, { archivalDeadline: undefined });
  } else if (isArchiveStatus) {
    // Project entered a terminal state — schedule archival
    const thread = await ctx.db
      .query("threads")
      .withIndex("projectId", (q) => q.eq("projectId", project._id))
      .first();

    if (thread && thread.archived !== "Archived") {
      const now = getCurrentTimestamp();
      const deadline = now + 86_400_000;

      const dateStr = formatLabDate(deadline, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      lines.push(`- This thread will be archived on **${dateStr}**`);

      // Store the deadline so the frontend can show when archival happens
      await ctx.db.patch(project._id, { archivalDeadline: deadline });

      await ctx.scheduler.runAfter(
        86_400_000,
        internal.projects.mutate.archiveProjectThread,
        { projectId: project._id },
      );
    }
  }

  return lines;
}

/**
 * Assigns a maker to the project record and its resource usage record.
 * Returns change-log lines for the system message.
 */
// ── Chat room membership helpers ────────────────────────────────────────────

/**
 * Find the chat room associated with a project, if any.
 * Projects link to rooms via the threads table (threads.projectId → threads.roomId).
 */
async function findProjectRoom(
  ctx: Pick<MutationCtx, "db">,
  projectId: Id<"projects">,
): Promise<Id<"rooms"> | null> {
  const thread = await ctx.db
    .query("threads")
    .withIndex("projectId", (q) => q.eq("projectId", projectId))
    .first();
  return thread?.roomId ?? null;
}

/**
 * Add a user to a room if they aren't already a member.
 */
export async function addRoomMember(
  ctx: Pick<MutationCtx, "db">,
  roomId: Id<"rooms">,
  participantId: Id<"userProfile">,
): Promise<void> {
  const existing = await ctx.db
    .query("roomMembers")
    .withIndex("by_roomId_participantId", (q) =>
      q.eq("roomId", roomId).eq("participantId", participantId),
    )
    .first();

  if (!existing) {
    await ctx.db.insert("roomMembers", { roomId, participantId });
  }
}

/**
 * Remove a user from a room if they are a member.
 */
export async function removeRoomMember(
  ctx: Pick<MutationCtx, "db">,
  roomId: Id<"rooms">,
  participantId: Id<"userProfile">,
): Promise<void> {
  const existing = await ctx.db
    .query("roomMembers")
    .withIndex("by_roomId_participantId", (q) =>
      q.eq("roomId", roomId).eq("participantId", participantId),
    )
    .first();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

/**
 * Check if a maker is still assigned to any other project that shares the
 * given chat room. Prevents removing a maker from a room they should still
 * have access to.
 */
async function isMakerAssignedToOtherProjectInRoom(
  ctx: Pick<MutationCtx, "db">,
  roomId: Id<"rooms">,
  excludeProjectId: Id<"projects">,
  makerId: Id<"userProfile">,
): Promise<boolean> {
  const threads = await ctx.db
    .query("threads")
    .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
    .collect();

  const otherProjectIds = threads
    .map((t) => t.projectId)
    .filter(
      (pid): pid is Id<"projects"> =>
        pid !== undefined && pid !== excludeProjectId,
    );

  if (otherProjectIds.length === 0) return false;

  const otherProjects = await Promise.all(
    otherProjectIds.map((pid) => ctx.db.get(pid)),
  );

  return otherProjects.some((p) => p?.assignedMaker === makerId);
}

/**
 * Assigns or unassigns a maker for a project.
 *
 * When **assigning** (`makerId` is a valid user ID): patches the project's
 * `assignedMaker`, adds the new maker to the project's chat room, and removes
 * the previous maker (if any) — unless they're still needed for another project
 * in the same room.
 *
 * When **unassigning** (`makerId` is `null`): clears `assignedMaker` and removes
 * the maker from the chat room (subject to the same multi-project guard).
 *
 * Returns change-log lines for the system message.
 */
export async function applyMakerAssignment(
  ctx: MutationCtx,
  project: Doc<"projects">,
  makerId: Id<"userProfile"> | null,
): Promise<string[]> {
  const messages: string[] = [];

  // ── Unassignment path ─────────────────────────────────────────────────────
  if (makerId === null) {
    // Already unassigned — nothing to do
    if (!project.assignedMaker) return [];

    const roomId = await findProjectRoom(ctx, project._id);
    if (roomId) {
      // Only remove from room if they aren't assigned to another project in it
      const stillNeeded = await isMakerAssignedToOtherProjectInRoom(
        ctx,
        roomId,
        project._id,
        project.assignedMaker,
      );
      if (!stillNeeded) {
        await removeRoomMember(ctx, roomId, project.assignedMaker);
      }
    }

    // Patch with undefined to clear the optional field
    await ctx.db.patch(project._id, { assignedMaker: undefined });

    messages.push(`- Maker unassigned from project`);
    return messages;
  }

  // ── Assignment / reassignment path ────────────────────────────────────────
  const makerProfile = await ctx.db.get(makerId);
  if (!makerProfile || makerProfile.role !== UserRole.MAKER) {
    throw new ConvexError("Assigned user must be a maker");
  }

  if (project.assignedMaker === makerId) return [];

  // Find the project room once — both removal and addition use the same room
  const roomId = await findProjectRoom(ctx, project._id);

  // If there was a previous maker who is being replaced, remove them from the room
  // but only if they aren't assigned to another project that shares the same room.
  if (project.assignedMaker) {
    if (roomId) {
      const stillNeeded = await isMakerAssignedToOtherProjectInRoom(
        ctx,
        roomId,
        project._id,
        project.assignedMaker,
      );
      if (!stillNeeded) {
        await removeRoomMember(ctx, roomId, project.assignedMaker);
        messages.push(`- Previous maker removed from project chat room`);
      }
    }
  }

  // Add the new maker to the project's chat room
  if (roomId) {
    await addRoomMember(ctx, roomId, makerId);
  }

  await ctx.db.patch(project._id, { assignedMaker: makerId });

  messages.push(`- Assigned maker updated to: **${makerProfile.name}**`);

  return messages;
}

export async function syncMaterialUsageStock(
  ctx: MutationCtx,
  materialId: Id<"materials">,
  previousAmountUsed: number,
  nextAmountUsed: number,
): Promise<void> {
  const material = await ctx.db.get(materialId);
  if (!material) throw new ConvexError("Material not found.");

  const newStock = Math.max(
    0,
    material.currentStock + previousAmountUsed - nextAmountUsed,
  );

  await ctx.db.patch(material._id, {
    currentStock: newStock,
    status: resolveMaterialStatus(newStock, material.reorderThreshold),
  });
}

export async function computeMaterialsUsedCost(
  ctx: MutationCtx,
  materialsUsed: { materialId: Id<"materials">; amountUsed: number }[],
): Promise<number> {
  let materialCost = 0;

  for (const usage of materialsUsed) {
    const material = await ctx.db.get(usage.materialId);
    if (!material) throw new ConvexError("Material not found.");
    materialCost += usage.amountUsed * (material.pricePerUnit ?? 0);
  }

  return materialCost;
}

/**
 * Schedules a project update email to be sent to the project owner.
 * Fetches all necessary project, user, and usage data to populate the email template.
 */
export async function scheduleProjectUpdateEmail(
  ctx: MutationCtx,
  projectId: Id<"projects">,
): Promise<void> {
  if (
    typeof process !== "undefined" &&
    process.env.DISABLE_SCHEDULED_EMAILS === "true"
  ) {
    return;
  }

  const project = await ctx.db.get(projectId);
  if (!project) return;
  const user = await ctx.db.get(project.userId);
  if (!user) return;
  const service = await ctx.db.get(project.service);
  const scheduledDate =
    project.bookingStartTime !== undefined
      ? formatLabDate(project.bookingStartTime, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined;

  const estimatedTime =
    project.bookingStartTime !== undefined &&
    project.bookingEndTime !== undefined
      ? `${(
          (project.bookingEndTime - project.bookingStartTime) /
          (1000 * 60 * 60)
        ).toFixed(1)} hours`
      : undefined;

  const bookingDurationMinutes =
    project.bookingStartTime !== undefined &&
    project.bookingEndTime !== undefined
      ? Math.floor(
          (project.bookingEndTime - project.bookingStartTime) / (1000 * 60),
        )
      : 0;

  const derivedPricing = derivePricingFromSchema({
    servicePricing: service?.serviceCategory,
    pricingVariant: project.pricing,
    serviceType: project.fulfillmentMode,
    bookingDurationMinutes,
    materialCost: project.pricingSnapshot?.materialCost ?? 0,
  });
  const pricingResult = project.pricingSnapshot ?? {
    setupFee: derivedPricing.setupFee,
    materialCost: derivedPricing.materialCost,
    timeCost: derivedPricing.timeCost,
    total: derivedPricing.total,
    duration: derivedPricing.duration,
    rate: derivedPricing.rate,
    unitName: derivedPricing.unitName,
  };

  ctx.scheduler.runAfter(0, internal.emails.emails.sendEmail, {
    to: user.email,
    subject: `Update on your project: ${project.name}`,
    projectName: project.name,
    requesterName: user.name,
    status: project.status,
    machine: service?.name,
    scheduledDate,
    estimatedTime,
    notes: project.notes,
    dashboardUrl: "https://fablab.harleyvan.com/dashboard/chat",
    pricing: {
      setupFee: pricingResult.setupFee,
      materialCost: pricingResult.materialCost,
      timeCost: pricingResult.timeCost,
      total: pricingResult.total,
    },
  });
}
