import { ConvexError } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { derivePricingFromSchema } from "../../src/lib/project-pricing";
import {
  formatLabDate,
  formatLabTime,
  getCurrentTimestamp,
  getLabDayStartTimestamp,
  getLabWeekday,
} from "../../src/lib/lab-time";
import {
  FILE_CATEGORIES,
  MaterialStatus,
  PROJECT_ARCHIVE_STATUSES,
  UserRole,
  type MaterialStatusType,
  type ProjectStatusType,
} from "../constants";
import { getWorkflow, getStatusLabel } from "../../src/lib/project-workflow";

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
  // Capacity check against the workshop session
  if (service.serviceCategory.type === "WORKSHOP") {
    const session = await ctx.db
      .query("workshopSessions")
      .withIndex("by_serviceId_startTime", (q) =>
        q.eq("serviceId", service._id).eq("startTime", booking.startTime),
      )
      .filter((q) => q.eq(q.field("date"), booking.date))
      .first();
    if (
      session &&
      session.maxSlots > 0 &&
      session.usedUpSlots >= session.maxSlots
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

  const session = await ctx.db
    .query("workshopSessions")
    .withIndex("by_serviceId_startTime", (q) =>
      q.eq("serviceId", service._id).eq("startTime", booking.startTime),
    )
    .filter((q) => q.eq(q.field("date"), booking.date))
    .first();
  if (session) {
    await ctx.db.patch(session._id, { usedUpSlots: session.usedUpSlots + 1 });
  }
}

export async function decrementWorkshopSlot(
  ctx: MutationCtx,
  service: ServiceDoc,
  usage: Doc<"resourceUsage">,
): Promise<void> {
  if (service.serviceCategory.type !== "WORKSHOP") return;

  const session = await ctx.db
    .query("workshopSessions")
    .withIndex("by_serviceId_startTime", (q) =>
      q.eq("serviceId", service._id).eq("startTime", usage.startTime),
    )
    .filter((q) =>
      q.eq(q.field("date"), getLabDayStartTimestamp(usage.startTime)),
    )
    .first();
  if (session && session.usedUpSlots > 0) {
    await ctx.db.patch(session._id, { usedUpSlots: session.usedUpSlots - 1 });
  }
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

  // Admins and makers have implicit access to all rooms — they don't need
  // explicit roomMembers records. Only the client (project owner) is added
  // so the client-facing query gate works correctly.

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
  status: ProjectStatus,
): Promise<string[]> {
  if (project.status === status) return [];

  const workflow = getWorkflow(project.type);
  if (!workflow.transitions[project.status]?.includes(status)) {
    throw new ConvexError(
      `Cannot change project status from ${project.status} to ${status}.`,
    );
  }

  // Enforce that transitioning to "paid" requires an existing receipt.
  // First-time payment must go through markProjectPaid which creates the receipt.
  if (status === "paid" && !project.receipt) {
    throw new ConvexError(
      "Cannot set status to paid without a receipt. Use markProjectPaid instead.",
    );
  }

  await ctx.db.patch(project._id, { status });

  const label = getStatusLabel(workflow, status);

  const lines: string[] = [`Status updated to: **${label}**`];

  // Release bookings, workshop slots, and any reserved materials on
  // cancellation / rejection so the project no longer holds resources.
  if (
    (status === "cancelled" || status === "rejected") &&
    project.status !== "cancelled" &&
    project.status !== "rejected"
  ) {
    const service = await ctx.db.get(project.service);
    const usages = await ctx.db
      .query("resourceUsage")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    for (const usage of usages) {
      // Only decrement the main workshop slot usage (no resource).
      // Resource usages (rooms, machines) should not decrement the slot counter.
      if (
        service &&
        service.serviceCategory.type === "WORKSHOP" &&
        !usage.resource
      ) {
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

  // Re-acquire workshop slot & re-create usage when reactivating from
  // cancelled/rejected — check capacity before allowing the transition.
  if (
    (project.status === "cancelled" || project.status === "rejected") &&
    status !== "cancelled" &&
    status !== "rejected" &&
    project.bookingStartTime != null
  ) {
    const service = await ctx.db.get(project.service);
    if (service && service.serviceCategory.type === "WORKSHOP") {
      const session = await ctx.db
        .query("workshopSessions")
        .withIndex("by_serviceId_startTime", (q) =>
          q
            .eq("serviceId", project.service)
            .eq("startTime", project.bookingStartTime!),
        )
        .filter((q) =>
          q.eq(
            q.field("date"),
            getLabDayStartTimestamp(project.bookingStartTime!),
          ),
        )
        .first();

      if (
        session &&
        session.maxSlots > 0 &&
        session.usedUpSlots >= session.maxSlots
      ) {
        throw new ConvexError(
          "Cannot reactivate — this workshop timeslot is fully booked.",
        );
      }

      // ── Re-create resourceUsage records ──────────────────────────────
      // The original usage records were deleted on cancellation. Re-create
      // them so the project appears in the calendar, has a valid invoice,
      // and retains accurate pricing snapshots. We create the usages BEFORE
      // incrementing the slot so createWorkshopUsage's internal capacity
      // check (which reads usedUpSlots) sees the current, un-incremented value.
      const booking: BookingWindow = {
        startTime: project.bookingStartTime!,
        endTime: project.bookingEndTime ?? project.bookingStartTime!,
        date: getLabDayStartTimestamp(project.bookingStartTime!),
      };

      const bookingDurationMs = booking.endTime - booking.startTime;
      const provisional = computeProvisionalCostBreakdown(
        service,
        project.pricing,
        project.fulfillmentMode,
        bookingDurationMs,
      );

      const usageSnapshot = {
        name: service.name,
        costAtTime: provisional.total,
        unit: "session",
      };

      const usagePricingSnapshot = buildUsagePricingSnapshot({
        duration: provisional.duration,
        rate: provisional.rate,
        timeCost: provisional.timeCost,
        materialCost: provisional.materialCost,
        setupFeePortion: provisional.setupFee,
        unitName: provisional.unitName,
        pricingVariant: project.pricing,
      });

      // Re-create the main workshop usage (no resource)
      await createWorkshopUsage(
        ctx,
        project.service,
        service,
        booking,
        project._id,
        usageSnapshot,
        usagePricingSnapshot,
      );

      // Re-create slot-level resource usages (rooms, machines)
      for (const resourceId of session?.resources ?? []) {
        await ctx.db.insert("resourceUsage", {
          projectId: project._id,
          service: project.service,
          resource: resourceId,
          startTime: booking.startTime,
          endTime: booking.endTime,
          snapshot: {
            name: service.name,
            costAtTime: 0,
            unit: "session",
          },
          pricingSnapshot: {
            duration: 0,
            rate: 0,
            timeCost: 0,
            materialCost: 0,
            setupFeePortion: 0,
            subtotal: 0,
            unitName: "session",
          },
        });
      }

      // Increment the slot AFTER re-creating usages so the capacity check
      // inside createWorkshopUsage sees the pre-increment value.
      await incrementWorkshopSlot(ctx, service, {
        startTime: project.bookingStartTime!,
        endTime: project.bookingEndTime ?? project.bookingStartTime!,
        date: getLabDayStartTimestamp(project.bookingStartTime!),
      });

      await syncProjectTotalInvoice(ctx, project._id, {
        fallbackTotal: provisional.total,
      });
    } else if (service && service.serviceCategory.type === "FABRICATION") {
      // Re-create fabrication resource usage that was deleted on cancellation.
      const booking: BookingWindow = {
        startTime: project.bookingStartTime!,
        endTime: project.bookingEndTime ?? project.bookingStartTime!,
        date: getLabDayStartTimestamp(project.bookingStartTime!),
      };

      // Validate that the time slot and resource are still available.
      // Another project may have booked this slot while this one was cancelled.
      await validateFabricationAvailability(
        ctx,
        project.service,
        service,
        booking,
      );

      const bookingDurationMs = booking.endTime - booking.startTime;
      const provisional = computeProvisionalCostBreakdown(
        service,
        project.pricing,
        project.fulfillmentMode,
        bookingDurationMs,
      );

      const usageSnapshot = {
        name: service.name,
        costAtTime: provisional.total,
        unit: service.serviceCategory.unitName,
      };

      const usagePricingSnapshot = buildUsagePricingSnapshot({
        duration: provisional.duration,
        rate: provisional.rate,
        timeCost: provisional.timeCost,
        materialCost: provisional.materialCost,
        setupFeePortion: provisional.setupFee,
        unitName: provisional.unitName,
        pricingVariant: project.pricing,
      });

      await createFabricationUsage(
        ctx,
        project.service,
        booking,
        project._id,
        usageSnapshot,
        usagePricingSnapshot,
      );
    }
  }

  // ── Unschedule / schedule on terminal status transitions ──────────────
  const wasArchiveStatus = PROJECT_ARCHIVE_STATUSES.includes(
    project.status as ProjectStatusType,
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
 * Assigns or unassigns a maker for a project.
 *
 * Maker assignment/unassignment is purely a business-domain concern.
 * Chat room access is handled implicitly — makers have access to all rooms.
 *
 * When **assigning** (`makerId` is a valid user ID): patches the project's
 * `assignedMaker`. Clears the previous maker (if any).
 *
 * When **unassigning** (`makerId` is `null`): clears `assignedMaker`.
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

// ── Workshop event helpers ───────────────────────────────────────────────────
// Shared between the workshops page query and any other code that needs to
// aggregate workshop projects into event records.

export function buildProjectGroups(
  projects: Doc<"projects">[],
  serviceId?: Id<"services">,
  startTime?: number,
): Map<string, Doc<"projects">[]> {
  let filtered = projects.filter((p) => p.bookingStartTime != null);

  if (serviceId) {
    filtered = filtered.filter((p) => p.service === serviceId);
  }
  if (startTime) {
    filtered = filtered.filter((p) => p.bookingStartTime === startTime);
  }

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
  return groups;
}

export async function buildEventsFromGroups(
  ctx: QueryCtx,
  groups: Map<string, Doc<"projects">[]>,
) {
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
    resources?: Id<"resources">[];
    availableMaterials?: Id<"materials">[];
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
    let resources: Id<"resources">[] | undefined;
    let availableMaterials: Id<"materials">[] | undefined;

    if (service.serviceCategory.type === "WORKSHOP") {
      const projectDate = getLabDayStartTimestamp(bookingStartTime);
      const session = await ctx.db
        .query("workshopSessions")
        .withIndex("by_serviceId_startTime", (q) =>
          q.eq("serviceId", service._id).eq("startTime", bookingStartTime),
        )
        .filter((q) => q.eq(q.field("date"), projectDate))
        .first();
      if (session) {
        endTime = session.endTime;
        maxSlots = session.maxSlots;
        usedSlots = session.usedUpSlots;
        resources = session.resources;
        availableMaterials = session.availableMaterials;
      }
    }

    // Use the first project's bookingEndTime as fallback
    if (groupProjects[0].bookingEndTime != null) {
      endTime = groupProjects[0].bookingEndTime;
    }

    // Separate active vs cancelled/rejected projects
    const TERMINAL_STATUSES = new Set(["cancelled", "rejected"]);
    const activeProjects = groupProjects.filter(
      (p) => !TERMINAL_STATUSES.has(p.status),
    );

    // Load attendee profiles + threads
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
      resources,
      availableMaterials,
      attendees,
    });
  }

  return events;
}

export function splitUpcomingPast<T extends { startTime: number }>(
  events: T[],
  todayStart: number,
): { upcoming: T[]; past: T[] } {
  const upcoming = events
    .filter((e) => e.startTime >= todayStart)
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 50);

  const past = events
    .filter((e) => e.startTime < todayStart)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 50);

  return { upcoming, past };
}
