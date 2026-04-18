import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";
import { Id, Doc } from "../_generated/dataModel";
import {
  BookingWindow,
  ProjectStatus,
  buildSearchText,
  resolveService,
  validateFileTypes,
  resolveBookingFromSharedUsage,
  validateBookingTiming,
  validateFabricationAvailability,
  computeProvisionalCostBreakdown,
  handleSharedResourceUsage,
  handleWorkshopResourceUsage,
  handleExclusiveResourceUsage,
  incrementWorkshopSlot,
  ensureProjectRoom,
  createProjectThread,
  computeCompletionCost,
  consumeMaterials,
  findProjectUsage,
  sendProjectSystemMessage,
  applyStatusChange,
  applyMakerAssignment,
  applyResourceAssignment,
  applyMaterialAssignment,
} from "./helper";

// ============================================================================
// Mutations
// ============================================================================

export const createProject = authMutation({
  args: {
    name: v.string(),
    description: v.string(),
    serviceType: v.union(
      v.literal("self-service"),
      v.literal("full-service"),
      v.literal("workshop"),
    ),
    material: v.union(v.literal("provide-own"), v.literal("buy-from-lab")),
    requestedMaterialId: v.optional(v.id("materials")),
    service: v.id("services"),
    pricing: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
    notes: v.string(),
    assignedMaker: v.optional(v.id("userProfile")),
    selectedTimeSlot: v.optional(
      v.object({
        startTime: v.number(),
        endTime: v.number(),
      }),
    ),
    booking: v.optional(
      v.object({
        startTime: v.number(),
        endTime: v.number(),
        date: v.number(),
      }),
    ),
    sharedUsageId: v.optional(v.id("resourceUsage")),
  },
  handler: async (ctx, args) => {
    // ── 1. Resolve service (user profile is guaranteed via authMutation) ─────
    const service = await resolveService(ctx, args.service);
    const userProfile = ctx.profile;

    // ── 2. Validate uploaded file types ─────────────────────────────────────
    await validateFileTypes(ctx, args.files ?? [], service);

    // ── 3. Resolve & validate booking window ────────────────────────────────
    let booking: BookingWindow;
    let sharedUsage: Doc<"resourceUsage"> | null = null;

    if (args.sharedUsageId) {
      const resolved = await resolveBookingFromSharedUsage(
        ctx,
        args.sharedUsageId,
      );
      booking = resolved.booking;
      sharedUsage = resolved.sharedUsage;
    } else if (args.booking) {
      booking = args.booking;
    } else {
      throw new ConvexError("Booking details are required.");
    }

    validateBookingTiming(booking);
    await validateFabricationAvailability(ctx, args.service, service, booking);

    // ── 4. Compute provisional cost for all pricing types ───────────────────
    const bookingDurationMs = booking.endTime - booking.startTime;
    const costBreakdown = computeProvisionalCostBreakdown(
      service,
      args.pricing,
      args.serviceType,
      bookingDurationMs,
    );

    // ── 5. Insert the project record ─────────────────────────────────────────
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      serviceType: args.serviceType,
      material: args.material,
      requestedMaterialId: args.requestedMaterialId,
      userId: userProfile._id,
      assignedMaker: args.assignedMaker,
      service: args.service,
      pricing: args.pricing,
      status: "pending",
      files: args.files,
      notes: args.notes,
      selectedTimeSlot: args.selectedTimeSlot,
      costBreakdown,
      searchText: buildSearchText({
        name: args.name,
        description: args.description,
        notes: args.notes,
      }),
    });

    // ── 6. Update resource usage records ────────────────────────────────────
    if (args.sharedUsageId && sharedUsage) {
      await handleSharedResourceUsage(
        ctx,
        args.sharedUsageId,
        sharedUsage,
        projectId,
      );
    } else if (service.serviceCategory.type === "WORKSHOP") {
      await handleWorkshopResourceUsage(
        ctx,
        args.service,
        service,
        booking,
        args.selectedTimeSlot,
        projectId,
        args.requestedMaterialId,
      );
    } else {
      await handleExclusiveResourceUsage(
        ctx,
        args.service,
        booking,
        projectId,
        args.requestedMaterialId,
      );
    }

    // ── 7. Increment workshop slot counter ───────────────────────────────────
    await incrementWorkshopSlot(ctx, service, booking, args.selectedTimeSlot);

    // ── 8. Ensure client messaging room exists ───────────────────────────────
    const roomId = await ensureProjectRoom(ctx, userProfile);

    // ── 9. Create project thread + initial message ───────────────────────────
    const threadId = await createProjectThread(
      ctx,
      roomId,
      projectId,
      userProfile,
      service,
      {
        name: args.name,
        description: args.description,
        serviceType: args.serviceType,
        material: args.material,
        pricing: args.pricing,
        notes: args.notes,
        files: args.files,
      },
      booking,
      now,
    );

    // ── 10. Claim uploaded files ─────────────────────────────────────────────
    if (args.files && args.files.length > 0) {
      claimFiles(ctx, args.files);
    }

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
        v.literal("cancelled"),
      ),
    ),
    // Assignments
    makerId: v.optional(v.id("userProfile")),
    resourceId: v.optional(v.id("resources")),
    materialId: v.optional(v.id("materials")),
  },
  handler: async (ctx, args) => {
    const existingProject = await ctx.db.get(args.projectId);
    if (!existingProject) throw new ConvexError("Project not found.");

    const messagelines: string[] = [];

    // ── Status change ────────────────────────────────────────────────────────
    if (args.status !== undefined) {
      const lines = await applyStatusChange(
        ctx,
        existingProject,
        existingProject,
        args.status as ProjectStatus,
      );
      messagelines.push(...lines);
    }

    // Re-fetch after potential status patch
    const project = (await ctx.db.get(args.projectId))!;

    // ── Maker assignment ─────────────────────────────────────────────────────
    if (args.makerId !== undefined) {
      const lines = await applyMakerAssignment(ctx, project, args.makerId);
      messagelines.push(...lines);
    }

    // ── Resource assignment ──────────────────────────────────────────────────
    if (args.resourceId !== undefined) {
      const lines = await applyResourceAssignment(
        ctx,
        project,
        args.resourceId,
      );
      messagelines.push(...lines);
    }

    // ── Material assignment ──────────────────────────────────────────────────
    if (args.materialId !== undefined) {
      const lines = await applyMaterialAssignment(
        ctx,
        project,
        args.materialId,
      );
      messagelines.push(...lines);
    }

    // ── System message ───────────────────────────────────────────────────────
    await sendProjectSystemMessage(ctx, args.projectId, messagelines);
  },
});

export const updateCostBreakdown = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    setupFee: v.number(),
    timeCost: v.number(),
    materialCost: v.number(),
    amountUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");

    const total = args.setupFee + args.timeCost + args.materialCost;

    // ── Detect what actually changed ─────────────────────────────────────────
    const existing = project.costBreakdown;

    const feeChanged = existing?.setupFee !== args.setupFee;
    const timeChanged = existing?.timeCost !== args.timeCost;
    const materialCostChanged = existing?.materialCost !== args.materialCost;
    const breakdownChanged = feeChanged || timeChanged || materialCostChanged;

    // Resolve existing amountUsed from the usage record
    let existingAmountUsed2: number | undefined;
    let usage = null;
    if (args.amountUsed !== undefined && project.requestedMaterialId) {
      usage = await findProjectUsage(ctx, project);
      existingAmountUsed2 = usage?.materialsUsed?.find(
        (m) => m.materialId === project.requestedMaterialId,
      )?.amountUsed;
    }
    const amountChanged =
      args.amountUsed !== undefined && args.amountUsed !== existingAmountUsed2;

    if (!breakdownChanged && !amountChanged) return;

    // ── Persist changes ──────────────────────────────────────────────────────
    if (breakdownChanged) {
      await ctx.db.patch(args.projectId, {
        costBreakdown: {
          setupFee: args.setupFee,
          timeCost: args.timeCost,
          materialCost: args.materialCost,
          total,
        },
      });
    }

    // ── Update amountUsed on the resource usage record ───────────────────────
    if (amountChanged && project.requestedMaterialId) {
      const resolvedUsage = usage ?? (await findProjectUsage(ctx, project));
      if (resolvedUsage) {
        await ctx.db.patch(resolvedUsage._id, {
          materialsUsed: [
            {
              materialId: project.requestedMaterialId as Id<"materials">,
              amountUsed: args.amountUsed!,
            },
          ],
        });
      }
    }

    // ── System message ───────────────────────────────────────────────────────
    const lines: string[] = [];
    if (breakdownChanged) {
      lines.push(
        `Cost breakdown updated:`,
        `- Setup fee: ₱${args.setupFee.toFixed(2)}`,
        `- Time cost: ₱${args.timeCost.toFixed(2)}`,
        `- Material cost: ₱${args.materialCost.toFixed(2)}`,
        `- **Total: ₱${total.toFixed(2)}**`,
      );
    }
    if (amountChanged && project.requestedMaterialId) {
      const materialDoc = await ctx.db.get(project.requestedMaterialId);
      lines.push(
        `- Material used: ${args.amountUsed} ${materialDoc?.unit ?? "units"} of ${materialDoc?.name ?? "material"}`,
      );
    }
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

    if (["completed", "rejected", "cancelled"].includes(project.status)) {
      throw new ConvexError("Cannot cancel a project in its current status.");
    }

    // applyStatusChange handles the patch, workshop slot release, and returns log lines
    const lines = await applyStatusChange(ctx, project, project, "cancelled");
    await sendProjectSystemMessage(ctx, args.projectId, lines);
  },
});

// ============================================================================

export const completeProject = authMutation({
  role: ["admin", "maker"],
  args: {
    projectId: v.id("projects"),
    actualDurationMs: v.number(),
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
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");

    const service = await ctx.db.get(project.service);
    if (!service) throw new ConvexError("Service not found.");

    // ── 1. Time-based cost ───────────────────────────────────────────────────
    const { setupFee, timeCost } = computeCompletionCost(
      service,
      project,
      args.actualDurationMs,
    );

    // ── 2. Material cost + stock deduction ───────────────────────────────────
    const materialCost =
      project.material === "buy-from-lab" && args.materialsUsed?.length
        ? await consumeMaterials(ctx, args.materialsUsed)
        : 0;

    // ── 3. Persist final cost breakdown ─────────────────────────────────────
    const total = setupFee + timeCost + materialCost;

    await ctx.db.patch(args.projectId, {
      status: "completed",
      costBreakdown: { setupFee, timeCost, materialCost, total },
    });

    // ── 4. Record materials on the usage log ─────────────────────────────────
    if (args.materialsUsed) {
      const usage = await findProjectUsage(ctx, project);
      if (usage) {
        await ctx.db.patch(usage._id, { materialsUsed: args.materialsUsed });
      }
    }

    // ── 5. System message ────────────────────────────────────────────────────
    const durationHours = (args.actualDurationMs / (1000 * 60 * 60)).toFixed(2);
    const lines: string[] = [
      `Project marked as **completed**.`,
      `- Actual duration: ${durationHours} hours`,
      `- Setup fee: ₱${setupFee.toFixed(2)}`,
      `- Time cost: ₱${timeCost.toFixed(2)}`,
      `- Material cost: ₱${materialCost.toFixed(2)}`,
      `- **Total: ₱${total.toFixed(2)}**`,
    ];
    if (args.materialsUsed && args.materialsUsed.length > 0) {
      for (const m of args.materialsUsed) {
        const materialDoc = await ctx.db.get(m.materialId);
        lines.push(
          `- Material consumed: ${m.amountUsed} ${materialDoc?.unit ?? "units"} of ${materialDoc?.name ?? m.materialId}`,
        );
      }
    }
    await sendProjectSystemMessage(ctx, args.projectId, lines);
  },
});
