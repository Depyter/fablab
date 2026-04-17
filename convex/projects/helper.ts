import { ConvexError } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { FILE_CATEGORIES } from "../constants";

// ============================================================================
// Types
// ============================================================================

export type BookingWindow = {
  startTime: number;
  endTime: number;
  date: number;
};

export type ServiceDoc = Doc<"services">;

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
  | { baseFee: number; materialCost: number; timeCost: number; total: number }
  | undefined {
  if (service.pricing.type !== "FIXED") return undefined;

  let amount = service.pricing.amount;
  if (service.pricing.variants) {
    const variant = service.pricing.variants.find(
      (v) => v.name === pricingVariant,
    );
    if (variant) amount = variant.amount;
  }

  const baseFee = serviceType === "self-service" ? 0 : amount;
  return { baseFee, materialCost: 0, timeCost: 0, total: baseFee };
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
    });
  }
}

export async function handleExclusiveResourceUsage(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  booking: BookingWindow,
  projectId: Id<"projects">,
): Promise<void> {
  await ctx.db.insert("resourceUsage", {
    service: serviceId,
    usageMode: "EXCLUSIVE",
    projects: [projectId],
    startTime: booking.startTime,
    endTime: booking.endTime,
    date: booking.date,
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
): { baseFee: number; timeCost: number } {
  const hours = actualDurationMs / (1000 * 60 * 60);
  const minutes = actualDurationMs / (1000 * 60);
  let baseFee = 0;
  let timeCost = 0;

  if (service.pricing.type === "COMPOSITE") {
    baseFee = service.pricing.baseFee;
    let timeRate = service.pricing.timeRate;

    if (service.pricing.variants) {
      const variant = service.pricing.variants.find(
        (v) => v.name === project.pricing,
      );
      if (variant) {
        baseFee = variant.baseFee;
        timeRate = variant.timeRate;
      }
    }

    if (project.serviceType === "self-service") baseFee = 0;

    const unit = service.pricing.unitName;
    timeCost =
      unit === "minute" || unit === "min"
        ? minutes * timeRate
        : hours * timeRate;
  } else if (service.pricing.type === "PER_UNIT") {
    baseFee = service.pricing.baseFee;
    let ratePerUnit = service.pricing.ratePerUnit;

    if (service.pricing.variants) {
      const variant = service.pricing.variants.find(
        (v) => v.name === project.pricing,
      );
      if (variant) {
        baseFee = variant.baseFee;
        ratePerUnit = variant.ratePerUnit;
      }
    }

    if (project.serviceType === "self-service") baseFee = 0;

    const unit = service.pricing.unitName;
    timeCost =
      unit === "minute" || unit === "min"
        ? minutes * ratePerUnit
        : hours * ratePerUnit;
  } else if (service.pricing.type === "FIXED") {
    baseFee = service.pricing.amount;

    if (service.pricing.variants) {
      const variant = service.pricing.variants.find(
        (v) => v.name === project.pricing,
      );
      if (variant) baseFee = variant.amount;
    }

    if (project.serviceType === "self-service") baseFee = 0;
  }

  return { baseFee, timeCost };
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
    let newStatus = material.status;

    if (newStock === 0) {
      newStatus = "OUT_OF_STOCK";
    } else if (
      material.reorderThreshold &&
      newStock <= material.reorderThreshold
    ) {
      newStatus = "LOW_STOCK";
    }

    await ctx.db.patch(material._id, {
      currentStock: newStock,
      status: newStatus,
    });
  }

  return materialCost;
}
