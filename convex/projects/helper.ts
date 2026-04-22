import { ConvexError } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { derivePricingFromSchema } from "../../src/lib/project-pricing";
import {
  FILE_CATEGORIES,
  MaterialStatus,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TRANSITIONS,
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
  date: number;
};

export type ServiceDoc = Doc<"services">;

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

export async function resolveBookingFromSharedUsage(
  ctx: MutationCtx,
  sharedUsageId: Id<"resourceUsage">,
): Promise<{ booking: BookingWindow; sharedUsage: Doc<"resourceUsage"> }> {
  const sharedUsage = await ctx.db.get(sharedUsageId);
  if (!sharedUsage) throw new ConvexError("Shared event not found.");
  if (sharedUsage.usageMode !== "SHARED") {
    throw new ConvexError("This resource is not a shared event.");
  }
  if (
    sharedUsage.maxCapacity &&
    sharedUsage.projects.length >= sharedUsage.maxCapacity
  ) {
    throw new ConvexError("Shared event is at maximum capacity.");
  }

  return {
    booking: {
      startTime: sharedUsage.startTime,
      endTime: sharedUsage.endTime,
      date: sharedUsage.date,
    },
    sharedUsage,
  };
}

export function validateBookingTiming(booking: BookingWindow): void {
  const now = Date.now();
  if (booking.startTime < now) {
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
): Promise<void> {
  if (service.serviceCategory.type !== "FABRICATION") return;

  // Day-of-week check
  if (service.serviceCategory.availableDays?.length) {
    const localDateString = new Date(booking.date).toLocaleString("en-US", {
      timeZone: "Asia/Manila",
    });
    const dayOfWeek = new Date(localDateString).getDay();
    if (!service.serviceCategory.availableDays.includes(dayOfWeek)) {
      throw new ConvexError(
        "Selected date falls on an unavailable day for this service.",
      );
    }
  }

  // Conflict check
  const existingUsages = await ctx.db
    .query("resourceUsage")
    .withIndex("by_service", (q) => q.eq("service", serviceId))
    .filter((q) => q.eq(q.field("date"), booking.date))
    .collect();

  for (const usage of existingUsages) {
    if (
      booking.startTime < usage.endTime &&
      booking.endTime > usage.startTime
    ) {
      throw new ConvexError("This timeslot is already booked.");
    }
  }
}

// ============================================================================
// Helpers — Cost
// ============================================================================

export function computeSharedFixedCostBreakdown(
  service: ServiceDoc,
  pricingVariant: string,
  serviceType: string,
):
  | { setupFee: number; materialCost: number; timeCost: number; total: number }
  | undefined {
  if (service.pricing.type !== "FIXED") return undefined;

  let amount = service.pricing.amount;
  if (service.pricing.variants) {
    const variant = service.pricing.variants.find(
      (v) => v.name === pricingVariant,
    );
    if (variant) amount = variant.amount;
  }

  const setupFee = serviceType === "self-service" ? 0 : amount;
  return { setupFee, materialCost: 0, timeCost: 0, total: setupFee };
}

export function computeProvisionalCostBreakdown(
  service: ServiceDoc,
  pricingVariant: string,
  serviceType: string,
  bookingDurationMs: number,
): { setupFee: number; materialCost: number; timeCost: number; total: number } {
  const breakdown = derivePricingFromSchema({
    servicePricing: service.pricing,
    pricingVariant,
    serviceType: serviceType as "self-service" | "full-service" | "workshop",
    bookingDurationMinutes: bookingDurationMs / (1000 * 60),
  });

  return {
    setupFee: breakdown.setupFee,
    materialCost: 0,
    timeCost: breakdown.timeCost,
    total: breakdown.total,
  };
}

// ============================================================================
// Helpers — Resource Usage
// ============================================================================

export async function handleSharedResourceUsage(
  ctx: MutationCtx,
  sharedUsageId: Id<"resourceUsage">,
  sharedUsage: Doc<"resourceUsage">,
  projectId: Id<"projects">,
): Promise<void> {
  await ctx.db.patch(sharedUsageId, {
    projects: [...sharedUsage.projects, projectId],
  });
}

export async function handleWorkshopResourceUsage(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  service: ServiceDoc,
  booking: BookingWindow,
  selectedTimeSlot: { startTime: number; endTime: number } | undefined,
  projectId: Id<"projects">,
  requestedMaterialId?: Id<"materials">,
): Promise<void> {
  const existingUsages = await ctx.db
    .query("resourceUsage")
    .withIndex("by_service", (q) => q.eq("service", serviceId))
    .collect();

  const existingUsage = existingUsages.find(
    (u) => u.date === booking.date && u.startTime === booking.startTime,
  );

  if (existingUsage) {
    if (
      existingUsage.maxCapacity &&
      existingUsage.projects.length >= existingUsage.maxCapacity
    ) {
      throw new ConvexError("This workshop timeslot is fully booked.");
    }
    await ctx.db.patch(existingUsage._id, {
      projects: [...existingUsage.projects, projectId],
    });
  } else {
    const slotStartTime = selectedTimeSlot?.startTime ?? booking.startTime;
    const schedule =
      service.serviceCategory.type === "WORKSHOP"
        ? service.serviceCategory.schedules.find((s) => s.date === booking.date)
        : undefined;
    const timeSlot = schedule?.timeSlots.find(
      (t) => t.startTime === slotStartTime,
    );

    await ctx.db.insert("resourceUsage", {
      service: serviceId,
      usageMode: "SHARED",
      projects: [projectId],
      startTime: booking.startTime,
      endTime: booking.endTime,
      date: booking.date,
      maxCapacity: timeSlot?.maxSlots,
      materialsUsed: requestedMaterialId
        ? [{ materialId: requestedMaterialId, amountUsed: 0 }]
        : undefined,
    });
  }
}

export async function handleExclusiveResourceUsage(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  booking: BookingWindow,
  projectId: Id<"projects">,
  requestedMaterialId?: Id<"materials">,
): Promise<void> {
  await ctx.db.insert("resourceUsage", {
    service: serviceId,
    usageMode: "EXCLUSIVE",
    projects: [projectId],
    startTime: booking.startTime,
    endTime: booking.endTime,
    date: booking.date,
    materialsUsed: requestedMaterialId
      ? [{ materialId: requestedMaterialId, amountUsed: 0 }]
      : undefined,
  });
}

export async function incrementWorkshopSlot(
  ctx: MutationCtx,
  service: ServiceDoc,
  booking: BookingWindow,
  selectedTimeSlot: { startTime: number; endTime: number } | undefined,
): Promise<void> {
  if (service.serviceCategory.type !== "WORKSHOP") return;

  const slotStartTime = selectedTimeSlot?.startTime ?? booking.startTime;

  const updatedSchedules = service.serviceCategory.schedules.map((s) => {
    if (s.date !== booking.date) return s;
    return {
      ...s,
      timeSlots: s.timeSlots.map((t) => {
        if (t.startTime !== slotStartTime) return t;
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
  selectedTimeSlot: { startTime: number; endTime: number } | undefined,
): Promise<void> {
  if (service.serviceCategory.type !== "WORKSHOP") return;

  const slotStartTime = selectedTimeSlot?.startTime ?? usage.startTime;

  const updatedSchedules = service.serviceCategory.schedules.map((s) => {
    if (s.date !== usage.date) return s;
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

  const workspaceName = `${userProfile.name}'s Channel`;
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
    lastMessageAt: Date.now(),
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
    serviceType: string;
    material: string;
    pricing: string;
    notes: string;
    files?: Id<"_storage">[];
  },
  booking: BookingWindow,
  now: number,
): Promise<Id<"threads">> {
  const bookingDateStr = new Date(booking.date).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startTimeStr = new Date(booking.startTime).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTimeStr = new Date(booking.endTime).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  });

  const messageContent = [
    `New project created: ${args.name}`,
    ``,
    `Service: ${service.name}`,
    `Description: ${args.description}`,
    `Service Type: ${args.serviceType}`,
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
// Helpers — Cost Computation (completeProject)
// ============================================================================

export function computeCompletionCost(
  service: ServiceDoc,
  project: Doc<"projects">,
  actualDurationMs: number,
): { setupFee: number; timeCost: number } {
  // All rates are stored per their unit; convert duration to that unit for cost.
  const durationMinutes = actualDurationMs / (1000 * 60);

  const unitToMinutes = (unit: string): number => {
    if (unit === "hour") return 60;
    if (unit === "day") return 60 * 24;
    return 1; // "minute" — rate is already per minute
  };

  let setupFee = 0;
  let timeCost = 0;

  if (service.pricing.type === "COMPOSITE") {
    setupFee = service.pricing.setupFee;
    let timeRate = service.pricing.timeRate;

    if (service.pricing.variants) {
      const variant = service.pricing.variants.find(
        (v) => v.name === project.pricing,
      );
      if (variant) {
        setupFee = variant.setupFee;
        timeRate = variant.timeRate;
      }
    }

    if (project.serviceType === "self-service") setupFee = 0;

    const durationInUnit =
      durationMinutes / unitToMinutes(service.pricing.unitName);
    timeCost = durationInUnit * timeRate;
  } else if (service.pricing.type === "PER_UNIT") {
    setupFee = service.pricing.setupFee;
    let ratePerUnit = service.pricing.ratePerUnit;

    if (service.pricing.variants) {
      const variant = service.pricing.variants.find(
        (v) => v.name === project.pricing,
      );
      if (variant) {
        setupFee = variant.setupFee;
        ratePerUnit = variant.ratePerUnit;
      }
    }

    if (project.serviceType === "self-service") setupFee = 0;

    const durationInUnit =
      durationMinutes / unitToMinutes(service.pricing.unitName);
    timeCost = durationInUnit * ratePerUnit;
  } else if (service.pricing.type === "FIXED") {
    setupFee = service.pricing.amount;

    if (service.pricing.variants) {
      const variant = service.pricing.variants.find(
        (v) => v.name === project.pricing,
      );
      if (variant) setupFee = variant.amount;
    }

    if (project.serviceType === "self-service") setupFee = 0;
  }

  return { setupFee, timeCost };
}

// ============================================================================
// Helpers — Project Updates
// ============================================================================

/**
 * Finds the resourceUsage record that contains the given project.
 */
export async function findProjectUsage(
  ctx: MutationCtx,
  project: Doc<"projects">,
): Promise<Doc<"resourceUsage"> | null> {
  const usages = await ctx.db
    .query("resourceUsage")
    .withIndex("by_service", (q) => q.eq("service", project.service))
    .collect();
  return usages.find((u) => u.projects.includes(project._id)) ?? null;
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
  await ctx.db.insert("messages", {
    room: thread.roomId,
    threadId: thread._id,
    content: lines.join("\n"),
    sender: "System",
  });
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

  // Release workshop slot on cancellation / rejection
  if (
    project.serviceType === "workshop" &&
    (status === "cancelled" || status === "rejected") &&
    existingProject.status !== "cancelled" &&
    existingProject.status !== "rejected"
  ) {
    const service = await ctx.db.get(project.service);
    if (service && service.serviceCategory.type === "WORKSHOP") {
      const usage = await findProjectUsage(ctx, project);
      if (usage) {
        await decrementWorkshopSlot(
          ctx,
          service,
          usage,
          project.selectedTimeSlot,
        );
        await ctx.db.patch(usage._id, {
          projects: usage.projects.filter((p) => p !== project._id),
        });
      }
    }
  }

  return lines;
}

/**
 * Assigns a maker to the project record and its resource usage record.
 * Returns change-log lines for the system message.
 */
export async function applyMakerAssignment(
  ctx: MutationCtx,
  project: Doc<"projects">,
  makerId: Id<"userProfile">,
): Promise<string[]> {
  const makerProfile = await ctx.db.get(makerId);
  if (!makerProfile || makerProfile.role !== "maker") {
    throw new ConvexError("Assigned user must be a maker");
  }

  if (project.assignedMaker === makerId) return [];

  await ctx.db.patch(project._id, { assignedMaker: makerId });

  const usage = await findProjectUsage(ctx, project);
  if (usage) {
    await ctx.db.patch(usage._id, { maker: makerId });
  }

  return [`- Assigned maker updated to: **${makerProfile.name}**`];
}

/**
 * Assigns a resource to the project's resource usage record.
 * Returns change-log lines for the system message.
 */
export async function applyResourceAssignment(
  ctx: MutationCtx,
  project: Doc<"projects">,
  resourceId: Id<"resources">,
): Promise<string[]> {
  const resourceDoc = await ctx.db.get(resourceId);
  if (!resourceDoc) throw new ConvexError("Resource not found.");

  const usage = await findProjectUsage(ctx, project);
  if (usage?.resource === resourceId) return [];

  if (usage) {
    await ctx.db.patch(usage._id, { resource: resourceId });
  }

  return [`- Resource updated to: **${resourceDoc.name}**`];
}

/**
 * Updates the requested material on the project record.
 * Returns change-log lines for the system message.
 */
export async function applyMaterialAssignment(
  ctx: MutationCtx,
  project: Doc<"projects">,
  materialId: Id<"materials">,
): Promise<string[]> {
  const materialDoc = await ctx.db.get(materialId);
  if (!materialDoc) throw new ConvexError("Material not found.");

  if (project.requestedMaterialId === materialId) return [];

  const usage = await findProjectUsage(ctx, project);
  const previousAmountUsed =
    project.requestedMaterialId === undefined
      ? 0
      : (usage?.materialsUsed?.find(
          (materialUsage) => materialUsage.materialId === project.requestedMaterialId,
        )?.amountUsed ?? 0);

  if (usage) {
    const nextMaterialsUsed = (usage.materialsUsed ?? []).filter(
      (materialUsage) =>
        materialUsage.materialId !== project.requestedMaterialId &&
        materialUsage.materialId !== materialId,
    );

    await ctx.db.patch(usage._id, {
      materialsUsed: [
        ...nextMaterialsUsed,
        { materialId, amountUsed: previousAmountUsed },
      ],
    });
  }

  await ctx.db.patch(project._id, { requestedMaterialId: materialId });

  if (project.requestedMaterialId && previousAmountUsed > 0) {
    await syncMaterialUsageStock(
      ctx,
      project.requestedMaterialId,
      previousAmountUsed,
      0,
    );
    await syncMaterialUsageStock(ctx, materialId, 0, previousAmountUsed);
  }

  return [`- Material updated to: **${materialDoc.name}**`];
}

// ============================================================================

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

export async function consumeMaterials(
  ctx: MutationCtx,
  materialsUsed: { materialId: Id<"materials">; amountUsed: number }[],
): Promise<number> {
  let materialCost = 0;

  for (const usage of materialsUsed) {
    const material = await ctx.db.get(usage.materialId);
    if (!material) continue;

    const rate = material.pricePerUnit || 0;
    materialCost += usage.amountUsed * rate;

    const newStock = Math.max(0, material.currentStock - usage.amountUsed);

    await ctx.db.patch(material._id, {
      currentStock: newStock,
      status: resolveMaterialStatus(newStock, material.reorderThreshold),
    });
  }

  return materialCost;
}
