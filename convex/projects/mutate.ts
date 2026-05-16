import { v, ConvexError } from "convex/values";
import { authMutation, checkAuthority, claimFiles } from "../helper";
import { Id } from "../_generated/dataModel";
import { internalMutation, MutationCtx } from "../_generated/server";
import {
  formatLabDate,
  formatLabTime,
  getCurrentTimestamp,
  getLabDayStartTimestamp,
} from "../../src/lib/lab-time";
import { PROJECT_ARCHIVE_STATUSES, type ProjectStatusType } from "../constants";
import { getWorkflow } from "../../src/lib/project-workflow";
import {
  BookingWindow,
  ProjectStatus,
  buildSearchText,
  resolveService,
  validateFileTypes,
  validateBookingTiming,
  validateFabricationAvailability,
  computeProvisionalCostBreakdown,
  buildTotalInvoice,
  buildPricingSnapshot,
  buildUsagePricingSnapshot,
  incrementWorkshopSlot,
  decrementWorkshopSlot,
  createWorkshopUsage,
  createFabricationUsage,
  ensureProjectRoom,
  createProjectThread,
  computeMaterialsUsedCost,
  syncProjectTotalInvoice,
  sendProjectSystemMessage,
  applyStatusChange,
  applyMakerAssignment,
  addRoomMember,
  syncMaterialUsageStock,
  buildMaterialSnapshot,
  scheduleProjectUpdateEmail,
} from "./helper";

// ============================================================================
// Type-aware business rules
// ============================================================================

// ============================================================================
// Mutations
// ============================================================================

function buildScheduleSystemLine(startTime: number, endTime: number) {
  const bookingDate = formatLabDate(startTime, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedStart = formatLabTime(startTime);
  const formattedEnd = formatLabTime(endTime);

  return `- Schedule: ${bookingDate} from ${formattedStart} to ${formattedEnd} (PST)`;
}

function assertUsageBelongsToProject(
  usage: { projectId: Id<"projects"> },
  projectId: Id<"projects">,
) {
  if (usage.projectId !== projectId) {
    throw new ConvexError("Usage does not belong to the specified project.");
  }
}

async function resolveCompatibleResource(
  ctx: MutationCtx,
  service: Awaited<ReturnType<typeof resolveService>>,
  resourceId: Id<"resources"> | null,
) {
  if (resourceId === null) return null;

  const resource = await ctx.db.get(resourceId);
  if (!resource) throw new ConvexError("Resource not found.");

  if (service.resources?.length && !service.resources.includes(resourceId)) {
    throw new ConvexError("Resource is not available for this service.");
  }

  return resource;
}

export const createProject = authMutation({
  args: {
    name: v.string(),
    description: v.string(),
    fulfillmentMode: v.union(
      v.literal("self-service"),
      v.literal("full-service"),
    ),
    material: v.union(v.literal("provide-own"), v.literal("buy-from-lab")),
    materialIds: v.optional(v.array(v.id("materials"))),
    service: v.id("services"),
    pricing: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
    notes: v.string(),
    assignedMaker: v.optional(v.id("userProfile")),
    booking: v.object({
      startTime: v.number(),
      endTime: v.number(),
      date: v.number(),
    }),
  },
  rateLimit: "createProject",
  handler: async (ctx, args) => {
    // ── 1. Resolve service ────────────────────────────────────────────────────
    const service = await resolveService(ctx, args.service);
    const userProfile = ctx.profile;

    // ── 2. Validate uploaded file types ──────────────────────────────────────
    await validateFileTypes(ctx, args.files ?? [], service);

    // ── 3. Validate booking window ────────────────────────────────────────────
    const booking: BookingWindow = args.booking;
    validateBookingTiming(booking);
    await validateFabricationAvailability(ctx, args.service, service, booking);

    // ── 4. Determine project type from service ────────────────────────────────
    const projectType =
      service.serviceCategory.type === "WORKSHOP" ? "WORKSHOP" : "FABRICATION";

    // ── 5. Compute provisional cost for snapshot ──────────────────────────────
    const bookingDurationMs = booking.endTime - booking.startTime;
    const provisional = computeProvisionalCostBreakdown(
      service,
      args.pricing,
      args.fulfillmentMode,
      bookingDurationMs,
    );

    const usageSnapshot = {
      name: service.name,
      costAtTime: provisional.total,
      unit:
        service.serviceCategory.type === "FABRICATION"
          ? service.serviceCategory.unitName
          : "session",
    };
    const usagePricingSnapshot = buildUsagePricingSnapshot({
      duration: provisional.duration,
      rate: provisional.rate,
      timeCost: provisional.timeCost,
      materialCost: provisional.materialCost,
      setupFeePortion: provisional.setupFee,
      unitName: provisional.unitName,
      pricingVariant: args.pricing,
    });

    // ── 6. Insert the project record ──────────────────────────────────────────
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      type: projectType,
      fulfillmentMode: args.fulfillmentMode,
      material: args.material,
      userId: userProfile._id,
      assignedMaker: args.assignedMaker,
      service: args.service,
      bookingStartTime: args.booking.startTime,
      bookingEndTime: args.booking.endTime,
      totalInvoice: buildTotalInvoice(provisional.total),
      pricingSnapshot: buildPricingSnapshot({
        setupFee: provisional.setupFee,
        timeCost: provisional.timeCost,
        materialCost: provisional.materialCost,
        duration: provisional.duration,
        rate: provisional.rate,
        unitName: provisional.unitName,
      }),
      pricing: args.pricing,
      status: "pending",
      files: args.files,
      notes: args.notes,
      searchText: buildSearchText({
        name: args.name,
        description: args.description,
        notes: args.notes,
      }),
    });

    // ── 7. Create resource usage record ───────────────────────────────────────
    if (projectType === "WORKSHOP") {
      await createWorkshopUsage(
        ctx,
        args.service,
        service,
        booking,
        projectId,
        usageSnapshot,
        usagePricingSnapshot,
        args.materialIds,
      );
      await incrementWorkshopSlot(ctx, service, booking);
    } else {
      await createFabricationUsage(
        ctx,
        args.service,
        booking,
        projectId,
        usageSnapshot,
        usagePricingSnapshot,
        args.materialIds,
      );
    }

    await syncProjectTotalInvoice(ctx, projectId, {
      fallbackTotal: provisional.total,
    });

    // ── 8. Ensure client messaging room exists ────────────────────────────────
    const roomId = await ensureProjectRoom(ctx, userProfile);

    // ── 9. Create project thread + initial message ────────────────────────────
    const threadId = await createProjectThread(
      ctx,
      roomId,
      projectId,
      userProfile,
      service,
      {
        name: args.name,
        description: args.description,
        type: projectType,
        fulfillmentMode: args.fulfillmentMode,
        material: args.material,
        pricing: args.pricing,
        notes: args.notes,
        files: args.files,
      },
      booking,
      now,
    );

    // ── 10. If a maker was pre-assigned, add them to the chat room ────────────
    if (args.assignedMaker) {
      await addRoomMember(ctx, roomId, args.assignedMaker);
    }

    // ── 11. Claim uploaded files ──────────────────────────────────────────────
    if (args.files && args.files.length > 0) {
      claimFiles(ctx, args.files);
    }

    await scheduleProjectUpdateEmail(ctx, projectId);
    return { projectId, roomId, threadId };
  },
});

// ============================================================================

export const updateProject = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    // Status transition
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("completed"),
        v.literal("paid"),
        v.literal("cancelled"),
        v.literal("claimed"),
      ),
    ),
    // Assignments
    //   - valid ID → assign/reassign that maker
    //   - null     → unassign the current maker
    //   - undefined → no change
    makerId: v.optional(v.union(v.id("userProfile"), v.null())),
  },
  handler: async (ctx, args) => {
    const existingProject = await ctx.db.get(args.projectId);
    if (!existingProject) throw new ConvexError("Project not found.");

    const messagelines: string[] = [];

    // ── Status change ────────────────────────────────────────────────────────
    if (args.status !== undefined) {
      // Enforce maker assignment for fabrication pending→approved (Bug 3)
      const workflow = getWorkflow(existingProject.type);
      if (
        args.status === "approved" &&
        existingProject.status === "pending" &&
        workflow.approvalRequiresMaker &&
        args.makerId === undefined
      ) {
        throw new ConvexError(
          "Maker must be assigned before approving a fabrication project.",
        );
      }

      const lines = await applyStatusChange(
        ctx,
        existingProject,
        args.status as ProjectStatus,
      );
      messagelines.push(...lines);
      await scheduleProjectUpdateEmail(ctx, args.projectId);
    }

    // Re-fetch after potential status patch
    const project = (await ctx.db.get(args.projectId))!;

    // ── Maker assignment ─────────────────────────────────────────────────────
    if (args.makerId !== undefined) {
      const lines = await applyMakerAssignment(ctx, project, args.makerId);
      messagelines.push(...lines);
    }

    // ── System message ───────────────────────────────────────────────────────
    await sendProjectSystemMessage(ctx, args.projectId, messagelines);
  },
});

export const createUsage = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    startTime: v.number(),
    endTime: v.number(),
    resourceId: v.optional(v.id("resources")),
    allowPastBooking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");
    const service = await ctx.db.get(project.service);
    if (!service) throw new ConvexError("Service not found.");

    const booking: BookingWindow = {
      startTime: args.startTime,
      endTime: args.endTime,
      date: getLabDayStartTimestamp(args.startTime),
    };

    validateBookingTiming(booking, {
      allowPastBooking: args.allowPastBooking,
    });
    const resource = await resolveCompatibleResource(
      ctx,
      service,
      args.resourceId ?? null,
    );
    await validateFabricationAvailability(
      ctx,
      project.service,
      service,
      booking,
      {
        resourceId: resource?._id ?? null,
      },
    );
    const provisional = computeProvisionalCostBreakdown(
      service,
      project.pricing,
      project.fulfillmentMode,
      args.endTime - args.startTime,
    );
    const usageSnapshot = {
      name: service.name,
      costAtTime: provisional.total,
      unit:
        service.serviceCategory.type === "FABRICATION"
          ? service.serviceCategory.unitName
          : "session",
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

    const usageId =
      service.serviceCategory.type === "WORKSHOP"
        ? await createWorkshopUsage(
            ctx,
            project.service,
            service,
            booking,
            project._id,
            usageSnapshot,
            usagePricingSnapshot,
          )
        : await createFabricationUsage(
            ctx,
            project.service,
            booking,
            project._id,
            usageSnapshot,
            usagePricingSnapshot,
          );

    if (service.serviceCategory.type === "WORKSHOP") {
      await incrementWorkshopSlot(ctx, service, booking);
    }

    if (resource) {
      await ctx.db.patch(usageId, { resource: resource._id });
    }

    await syncProjectTotalInvoice(ctx, project._id);
    await scheduleProjectUpdateEmail(ctx, project._id);

    const lines = [
      "Usage added:",
      buildScheduleSystemLine(args.startTime, args.endTime),
    ];
    if (resource) {
      lines.push(`- Resource: **${resource.name}**`);
    }
    await sendProjectSystemMessage(ctx, project._id, lines);

    return { usageId };
  },
});

export const updateUsage = authMutation({
  args: {
    projectId: v.id("projects"),
    usageId: v.id("resourceUsage"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    resourceId: v.optional(v.union(v.id("resources"), v.null())),
    allowPastBooking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const [project, usage] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db.get(args.usageId),
    ]);
    if (!project) throw new ConvexError("Project not found.");
    if (!usage) throw new ConvexError("Usage not found.");
    assertUsageBelongsToProject(usage, args.projectId);

    const isOwner = project.userId === ctx.profile._id;
    const isPrivileged = await checkAuthority(
      ["admin", "maker"],
      ctx.user,
      ctx,
    );

    if (!isOwner && !isPrivileged) {
      throw new ConvexError("Unauthorized. Cannot update resource.");
    }

    if (!isPrivileged && args.resourceId !== undefined) {
      throw new ConvexError("Unauthorized. Cannot modify restricted fields.");
    }

    const service = await ctx.db.get(project.service);
    if (!service) throw new ConvexError("Service not found.");

    const nextStartTime = args.startTime ?? usage.startTime;
    const nextEndTime = args.endTime ?? usage.endTime;
    const bookingChanged =
      nextStartTime !== usage.startTime || nextEndTime !== usage.endTime;

    const nextResource =
      args.resourceId !== undefined
        ? await resolveCompatibleResource(ctx, service, args.resourceId)
        : null;
    const nextResourceId =
      args.resourceId !== undefined
        ? (nextResource?._id ?? undefined)
        : usage.resource;
    const resourceChanged = usage.resource !== nextResourceId;

    if (!bookingChanged && !resourceChanged) return;

    const booking: BookingWindow = {
      startTime: nextStartTime,
      endTime: nextEndTime,
      date: getLabDayStartTimestamp(nextStartTime),
    };
    validateBookingTiming(booking, {
      allowPastBooking: args.allowPastBooking,
    });
    await validateFabricationAvailability(
      ctx,
      project.service,
      service,
      booking,
      {
        resourceId: nextResourceId ?? null,
        excludeUsageId: usage._id,
      },
    );

    const updates: {
      startTime?: number;
      endTime?: number;
      resource?: Id<"resources">;
    } = {};
    if (bookingChanged) {
      updates.startTime = nextStartTime;
      updates.endTime = nextEndTime;
    }
    if (args.resourceId !== undefined) {
      updates.resource = nextResourceId;
    }

    // ── Workshop slot tracking ────────────────────────────────────────────
    if (service.serviceCategory.type === "WORKSHOP" && bookingChanged) {
      // Decrement the old time slot before updating the record
      await decrementWorkshopSlot(ctx, service, usage);

      // Re-fetch the service — decrementWorkshopSlot patched the document
      const refreshedService = await ctx.db.get(project.service);
      if (!refreshedService) throw new ConvexError("Service not found.");

      // Update usage time
      await ctx.db.patch(usage._id, updates);

      // Increment the new time slot
      await incrementWorkshopSlot(ctx, refreshedService, booking);

      // Keep project-level booking times in sync with the single workshop usage
      await ctx.db.patch(project._id, {
        bookingStartTime: nextStartTime,
        bookingEndTime: nextEndTime,
      });
    } else {
      await ctx.db.patch(usage._id, updates);
    }

    await syncProjectTotalInvoice(ctx, project._id);
    await scheduleProjectUpdateEmail(ctx, project._id);

    const lines: string[] = [];
    if (bookingChanged) {
      lines.push(
        "Booking updated:",
        buildScheduleSystemLine(nextStartTime, nextEndTime),
      );
    }
    if (args.resourceId !== undefined) {
      if (lines.length === 0) {
        lines.push("Usage assignment updated:");
      }
      lines.push(
        nextResource
          ? `- Resource: **${nextResource.name}**`
          : "- Resource cleared",
      );
    }
    await sendProjectSystemMessage(ctx, project._id, lines);
  },
});

export const updateUsagePricing = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    usageId: v.id("resourceUsage"),
    duration: v.number(),
    rate: v.number(),
    timeCost: v.number(),
    materialCost: v.number(),
    setupFeePortion: v.number(),
    unitName: v.string(),
    materialsUsed: v.optional(
      v.array(
        v.object({
          materialId: v.id("materials"),
          amountUsed: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const [project, usage] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db.get(args.usageId),
    ]);
    if (!project) throw new ConvexError("Project not found.");
    if (!usage) throw new ConvexError("Usage not found.");
    assertUsageBelongsToProject(usage, args.projectId);

    if (Math.abs(args.duration * args.rate - args.timeCost) > 0.0001) {
      throw new ConvexError(
        "Time cost must match the provided duration and rate.",
      );
    }

    if (args.materialsUsed) {
      const expectedMaterialCost = await computeMaterialsUsedCost(
        ctx,
        args.materialsUsed,
      );
      if (Math.abs(expectedMaterialCost - args.materialCost) > 0.0001) {
        throw new ConvexError(
          "Material cost must match the selected materials and quantities.",
        );
      }
    }

    const updates: {
      pricingSnapshot: ReturnType<typeof buildUsagePricingSnapshot>;
      snapshot: typeof usage.snapshot;
      materialsUsed?: typeof usage.materialsUsed;
    } = {
      pricingSnapshot: buildUsagePricingSnapshot({
        duration: args.duration,
        rate: args.rate,
        timeCost: args.timeCost,
        materialCost: args.materialCost,
        setupFeePortion: args.setupFeePortion,
        unitName: args.unitName,
        pricingVariant: project.pricing,
      }),
      snapshot: {
        ...usage.snapshot,
        costAtTime: args.setupFeePortion + args.timeCost + args.materialCost,
      },
    };

    const materialLines: string[] = [];
    if (args.materialsUsed) {
      const previousAmounts = new Map(
        (usage.materialsUsed ?? []).map((material) => [
          material.materialId,
          material.amountUsed,
        ]),
      );

      for (const existing of usage.materialsUsed ?? []) {
        if (
          !args.materialsUsed.some((m) => m.materialId === existing.materialId)
        ) {
          await syncMaterialUsageStock(
            ctx,
            existing.materialId,
            existing.amountUsed,
            0,
          );
        }
      }

      const nextMaterials = await Promise.all(
        args.materialsUsed.map(async ({ materialId, amountUsed }) => {
          const previousAmount = previousAmounts.get(materialId) ?? 0;
          await syncMaterialUsageStock(
            ctx,
            materialId,
            previousAmount,
            amountUsed,
          );
          const materialDoc = await ctx.db.get(materialId);
          if (materialDoc) {
            materialLines.push(
              `- Material used: ${amountUsed} ${materialDoc.unit} of ${materialDoc.name}`,
            );
          }
          return {
            materialId,
            amountUsed,
            snapshot: materialDoc
              ? buildMaterialSnapshot(materialDoc)
              : undefined,
          };
        }),
      );

      updates.materialsUsed = nextMaterials;
    }

    await ctx.db.patch(usage._id, updates);
    await syncProjectTotalInvoice(ctx, project._id, {
      preferStoredUsageSnapshots: true,
    });
    await scheduleProjectUpdateEmail(ctx, project._id);

    await sendProjectSystemMessage(ctx, project._id, [
      "Usage pricing updated:",
      `- Setup fee portion: ₱${args.setupFeePortion.toFixed(2)}`,
      `- Time cost: ₱${args.timeCost.toFixed(2)}`,
      `- Material cost: ₱${args.materialCost.toFixed(2)}`,
      `- **Subtotal: ₱${updates.pricingSnapshot.subtotal.toFixed(2)}**`,
      ...materialLines,
    ]);
  },
});

export const deleteUsage = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    usageId: v.id("resourceUsage"),
  },
  handler: async (ctx, args) => {
    const [project, usage] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db.get(args.usageId),
    ]);
    if (!project) throw new ConvexError("Project not found.");
    if (!usage) throw new ConvexError("Usage not found.");
    assertUsageBelongsToProject(usage, args.projectId);

    const service = await ctx.db.get(project.service);
    if (!service) throw new ConvexError("Service not found.");

    if (service.serviceCategory.type === "WORKSHOP") {
      await decrementWorkshopSlot(ctx, service, usage);
    }

    for (const material of usage.materialsUsed ?? []) {
      await syncMaterialUsageStock(
        ctx,
        material.materialId,
        material.amountUsed,
        0,
      );
    }

    await ctx.db.delete(usage._id);
    await syncProjectTotalInvoice(ctx, project._id);
    await scheduleProjectUpdateEmail(ctx, project._id);
  },
});

export const updateProjectSchedule = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    startTime: v.number(),
    endTime: v.number(),
    allowPastBooking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");

    const booking: BookingWindow = {
      startTime: args.startTime,
      endTime: args.endTime,
      date: getLabDayStartTimestamp(args.startTime),
    };
    validateBookingTiming(booking, {
      allowPastBooking: args.allowPastBooking,
    });

    if (
      project.bookingStartTime === args.startTime &&
      project.bookingEndTime === args.endTime
    ) {
      return;
    }

    // ── Workshop slot + usage sync ──────────────────────────────────────────
    const service = await ctx.db.get(project.service);
    if (service && service.serviceCategory.type === "WORKSHOP") {
      const usageDocs = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      // Workshops have a single usage record — keep it in sync with schedule
      const usage = usageDocs[0];
      if (usage) {
        // Decrement old slot
        await decrementWorkshopSlot(ctx, service, usage);

        // Re-fetch service — decrementWorkshopSlot patched the document
        const refreshedService = await ctx.db.get(project.service);
        if (!refreshedService) throw new ConvexError("Service not found.");

        // Update usage time to match new schedule
        await ctx.db.patch(usage._id, {
          startTime: args.startTime,
          endTime: args.endTime,
        });

        // Increment new slot
        await incrementWorkshopSlot(ctx, refreshedService, booking);
      }
    }

    await ctx.db.patch(project._id, {
      bookingStartTime: args.startTime,
      bookingEndTime: args.endTime,
    });
    await scheduleProjectUpdateEmail(ctx, project._id);
    await sendProjectSystemMessage(ctx, project._id, [
      "Project schedule updated:",
      buildScheduleSystemLine(args.startTime, args.endTime),
    ]);
  },
});

export const markProjectPaid = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    receiptString: v.string(),
    paymentMode: v.union(
      v.literal("cash"),
      v.literal("gcash"),
      v.literal("bank transfer"),
      v.literal("others"),
    ),
    proof: v.string(),
    proofFiles: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");

    const workflow = getWorkflow(project.type);
    if (!workflow.payableStatuses.includes(project.status)) {
      throw new ConvexError("Project is not currently payable.");
    }

    if (project.status !== "paid") {
      if (!workflow.transitions[project.status]?.includes("paid")) {
        throw new ConvexError("Project is not currently payable.");
      }
    }

    let receiptId: Id<"receipts">;
    if (project.receipt) {
      // Update existing receipt record
      await ctx.db.patch(project.receipt, {
        receiptString: args.receiptString,
        paymentMode: args.paymentMode,
        proof: args.proof,
        ...(args.proofFiles !== undefined ? { files: args.proofFiles } : {}),
      });
      receiptId = project.receipt as Id<"receipts">;
    } else {
      receiptId = await ctx.db.insert("receipts", {
        receiptString: args.receiptString,
        paymentMode: args.paymentMode,
        proof: args.proof,
        files: args.proofFiles,
      });
    }

    await ctx.db.patch(args.projectId, {
      status: "paid",
      receipt: receiptId,
    });

    // Clean up archive deadline if leaving a terminal status (Bug 1)
    const wasArchiveStatus = PROJECT_ARCHIVE_STATUSES.includes(
      project.status as ProjectStatusType,
    );
    if (wasArchiveStatus) {
      await ctx.db.patch(args.projectId, { archivalDeadline: undefined });
    }

    await scheduleProjectUpdateEmail(ctx, args.projectId);

    const nextLabel =
      project.type === "WORKSHOP" ? "workshop confirmed" : "claim";

    const lines: string[] = [
      `Payment recorded. Project moved to **${nextLabel}**.`,
      `- Receipt #: ${args.receiptString}`,
      `- Payment mode: ${args.paymentMode}`,
      ...(args.proof ? [`- Proof: ${args.proof}`] : []),
    ];
    await sendProjectSystemMessage(ctx, args.projectId, lines);
  },
});

// ============================================================================

export const cancelOwnProject = authMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!userProfile) throw new ConvexError("User not authorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");

    if (project.userId !== userProfile._id) {
      throw new ConvexError("You do not own this project.");
    }

    // applyStatusChange validates the transition through PROJECT_STATUS_TRANSITIONS,
    // handles the patch, workshop slot release, and returns log lines.
    const lines = await applyStatusChange(ctx, project, "cancelled");
    await scheduleProjectUpdateEmail(ctx, args.projectId);
    await sendProjectSystemMessage(ctx, args.projectId, lines);
  },
});

// ============================================================================

export const updateOwnProjectDetails = authMutation({
  role: ["admin", "maker", "client"],
  args: {
    projectId: v.id("projects"),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    material: v.optional(
      v.union(v.literal("provide-own"), v.literal("buy-from-lab")),
    ),
    fulfillmentMode: v.optional(
      v.union(v.literal("self-service"), v.literal("full-service")),
    ),
    files: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");
    const service = await ctx.db.get(project.service);
    if (!service) throw new ConvexError("Service not found.");

    const isPrivileged =
      ctx.profile.role === "admin" || ctx.profile.role === "maker";

    if (!isPrivileged && project.userId !== ctx.profile._id) {
      throw new ConvexError("You do not own this project.");
    }

    if (!isPrivileged && project.status !== "pending") {
      throw new ConvexError(
        "Project details can only be updated while still in review.",
      );
    }

    const patch: Partial<typeof project> = {};
    const changed: string[] = [];

    if (
      args.description !== undefined &&
      args.description !== project.description
    ) {
      patch.description = args.description;
      changed.push("description");
    }
    if (args.notes !== undefined && args.notes !== project.notes) {
      patch.notes = args.notes;
      changed.push("notes");
    }
    if (args.material !== undefined && args.material !== project.material) {
      patch.material = args.material;
      changed.push("material");
    }
    if (
      args.fulfillmentMode !== undefined &&
      args.fulfillmentMode !== project.fulfillmentMode
    ) {
      patch.fulfillmentMode = args.fulfillmentMode;
      changed.push("fulfillment mode");
    }
    if (args.files !== undefined) {
      patch.files = args.files;
      changed.push("attachments");
      await claimFiles(ctx, args.files);
    }

    if (Object.keys(patch).length === 0) return;

    patch.searchText = buildSearchText({
      name: project.name,
      description: patch.description ?? project.description,
      notes: patch.notes ?? project.notes,
    });

    await ctx.db.patch(args.projectId, patch);
    if (patch.fulfillmentMode !== undefined) {
      await syncProjectTotalInvoice(ctx, args.projectId);
    }
    await scheduleProjectUpdateEmail(ctx, args.projectId);

    const actorLabel =
      ctx.profile.role === "client"
        ? "Client"
        : ctx.profile.role === "admin"
          ? "Admin"
          : "Maker";

    await sendProjectSystemMessage(ctx, args.projectId, [
      `${actorLabel} updated: ${changed.join(", ")}.`,
    ]);
  },
});

// ── Scheduled archival ───────────────────────────────────────────────────────
// Called by ctx.scheduler.runAfter from applyStatusChange when a project reaches
// a terminal status. Sends a final system message then archives the thread.

export const archiveProjectThread = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    // Don't archive if the project no longer exists or has left the terminal state
    if (!project) return;

    const isTerminal =
      project.status === "cancelled" ||
      project.status === "rejected" ||
      project.status === "claimed";
    if (!isTerminal) return;

    const thread = await ctx.db
      .query("threads")
      .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!thread || thread.archived === "Archived") return;

    await ctx.db.patch(thread._id, { archived: "Archived" });

    // Send a final system message confirming archival
    const content = "This thread has been archived.";
    const now = getCurrentTimestamp();
    await ctx.db.insert("messages", {
      room: thread.roomId,
      threadId: thread._id,
      content,
      sender: "System",
    });
    await ctx.db.patch(thread._id, {
      lastMessageText: content,
      lastMessageAt: now,
      messageCount: (thread.messageCount ?? 0) + 1,
    });
  },
});
