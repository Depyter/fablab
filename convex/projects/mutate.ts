import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";
import { Id } from "../_generated/dataModel";

import {
  BookingWindow,
  ProjectStatus,
  buildSearchText,
  resolveService,
  validateFileTypes,
  validateBookingTiming,
  validateFabricationAvailability,
  computeProvisionalCostBreakdown,
  createWorkshopUsage,
  createFabricationUsage,
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
  syncMaterialUsageStock,
  buildMaterialSnapshot,
  scheduleProjectUpdateEmail,
} from "./helper";

// ============================================================================
// Mutations
// ============================================================================

export const createProject = authMutation({
  args: {
    name: v.string(),
    description: v.string(),
    fulfillmentMode: v.union(
      v.literal("self-service"),
      v.literal("full-service"),
      v.literal("staff-led"),
    ),
    material: v.union(v.literal("provide-own"), v.literal("buy-from-lab")),
    requestedMaterials: v.optional(v.array(v.id("materials"))),
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

    // ── 6. Insert the project record ──────────────────────────────────────────
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      type: projectType,
      fulfillmentMode: args.fulfillmentMode,
      material: args.material,
      requestedMaterials: args.requestedMaterials,
      userId: userProfile._id,
      assignedMaker: args.assignedMaker,
      service: args.service,
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
        args.requestedMaterials,
      );
      await incrementWorkshopSlot(ctx, service, booking);
    } else {
      await createFabricationUsage(
        ctx,
        args.service,
        booking,
        projectId,
        usageSnapshot,
        args.requestedMaterials,
      );
    }

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

    // ── 10. Claim uploaded files ──────────────────────────────────────────────
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
        v.literal("cancelled"),
        v.literal("paid"),
      ),
    ),
    // Assignments
    makerId: v.optional(v.id("userProfile")),
    resourceId: v.optional(v.id("resources")),
    materialIds: v.optional(v.array(v.id("materials"))),
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
      await scheduleProjectUpdateEmail(ctx, args.projectId);
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
    if (args.materialIds !== undefined) {
      const lines = await applyMaterialAssignment(
        ctx,
        project,
        args.materialIds,
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

    const subtotal = args.setupFee + args.timeCost + args.materialCost;
    const total = subtotal;

    // ── Detect what actually changed ─────────────────────────────────────────
    const breakdownChanged = project.totalInvoice?.subtotal !== subtotal;

    let usage = null;
    let materialsChanged = false;

    if (args.materialsUsed && args.materialsUsed.length > 0) {
      usage = await findProjectUsage(ctx, project);
      for (const { materialId, amountUsed } of args.materialsUsed) {
        const existing =
          usage?.materialsUsed?.find((m) => m.materialId === materialId)
            ?.amountUsed ?? 0;
        if (amountUsed !== existing) {
          materialsChanged = true;
          break;
        }
      }
    }

    if (!breakdownChanged && !materialsChanged) return;

    const resolvedUsage = usage ?? (await findProjectUsage(ctx, project));

    // ── Persist invoice ───────────────────────────────────────────────────────
    if (breakdownChanged) {
      await ctx.db.patch(args.projectId, {
        totalInvoice: { subtotal, tax: 0, total },
      });

      if (resolvedUsage) {
        await ctx.db.patch(resolvedUsage._id, {
          snapshot: { ...resolvedUsage.snapshot, costAtTime: total },
        });
      }
    }

    // ── Sync per-material amounts + stock ─────────────────────────────────────
    if (materialsChanged && resolvedUsage && args.materialsUsed) {
      let nextMaterials = [...(resolvedUsage.materialsUsed ?? [])];
      const systemLines: string[] = [];

      for (const { materialId, amountUsed } of args.materialsUsed) {
        const existing = nextMaterials.find((m) => m.materialId === materialId);
        const previousAmount = existing?.amountUsed ?? 0;
        if (amountUsed === previousAmount) continue;

        await syncMaterialUsageStock(
          ctx,
          materialId,
          previousAmount,
          amountUsed,
        );

        const materialDoc = await ctx.db.get(materialId);
        nextMaterials = [
          ...nextMaterials.filter((m) => m.materialId !== materialId),
          {
            materialId,
            amountUsed,
            snapshot: materialDoc
              ? buildMaterialSnapshot(materialDoc)
              : undefined,
          },
        ];

        if (materialDoc) {
          systemLines.push(
            `- Material used: ${amountUsed} ${materialDoc.unit} of ${materialDoc.name}`,
          );
        }
      }

      await ctx.db.patch(resolvedUsage._id, { materialsUsed: nextMaterials });

      // ── System message ──────────────────────────────────────────────────────
      const lines: string[] = [];
      if (breakdownChanged) {
        lines.push(
          `Invoice updated:`,
          `- Setup fee: ₱${args.setupFee.toFixed(2)}`,
          `- Time cost: ₱${args.timeCost.toFixed(2)}`,
          `- Material cost: ₱${args.materialCost.toFixed(2)}`,
          `- **Total: ₱${total.toFixed(2)}**`,
        );
      }
      lines.push(...systemLines);
      await sendProjectSystemMessage(ctx, args.projectId, lines);
      return;
    }

    // ── System message (breakdown only) ──────────────────────────────────────
    if (breakdownChanged) {
      await sendProjectSystemMessage(ctx, args.projectId, [
        `Invoice updated:`,
        `- Setup fee: ₱${args.setupFee.toFixed(2)}`,
        `- Time cost: ₱${args.timeCost.toFixed(2)}`,
        `- Material cost: ₱${args.materialCost.toFixed(2)}`,
        `- **Total: ₱${total.toFixed(2)}**`,
      ]);
    }
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
    if (project.status !== "completed" && project.status !== "paid") {
      throw new ConvexError(
        "Only completed or paid projects can have payment details set.",
      );
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

    await scheduleProjectUpdateEmail(ctx, args.projectId);

    const lines: string[] = [
      `Payment recorded. Project moved to **claim**.`,
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

    if (
      ["completed", "paid", "rejected", "cancelled"].includes(project.status)
    ) {
      throw new ConvexError("Cannot cancel a project in its current status.");
    }

    // applyStatusChange handles the patch, workshop slot release, and returns log lines
    const lines = await applyStatusChange(ctx, project, project, "cancelled");
    await scheduleProjectUpdateEmail(ctx, args.projectId);
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

    // ── 3. Persist final invoice ─────────────────────────────────────────────
    const total = setupFee + timeCost + materialCost;

    await ctx.db.patch(args.projectId, {
      status: "completed",
      totalInvoice: { subtotal: total, tax: 0, total },
    });

    await scheduleProjectUpdateEmail(ctx, args.projectId);

    // ── 4. Update usage snapshot and record materials ─────────────────────────
    const usage = await findProjectUsage(ctx, project);
    if (usage) {
      await ctx.db.patch(usage._id, {
        snapshot: { ...usage.snapshot, costAtTime: total },
      });

      if (args.materialsUsed) {
        const materialsWithSnapshots = await Promise.all(
          args.materialsUsed.map(async (m) => {
            const materialDoc = await ctx.db.get(m.materialId);
            return {
              ...m,
              snapshot: materialDoc
                ? buildMaterialSnapshot(materialDoc)
                : undefined,
            };
          }),
        );
        await ctx.db.patch(usage._id, {
          materialsUsed: materialsWithSnapshots,
        });
      }
    }

    // ── 5. System message ────────────────────────────────────────────────────
    const durationHours = (args.actualDurationMs / (1000 * 60 * 60)).toFixed(2);
    const lines: string[] = [
      `Fabrication complete. Project moved to **payment**.`,
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

// ============================================================================

export const updateOwnProjectDetails = authMutation({
  args: {
    projectId: v.id("projects"),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    material: v.optional(
      v.union(v.literal("provide-own"), v.literal("buy-from-lab")),
    ),
    fulfillmentMode: v.optional(
      v.union(
        v.literal("self-service"),
        v.literal("full-service"),
        v.literal("staff-led"),
      ),
    ),
    files: v.optional(v.array(v.id("_storage"))),
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

    if (project.status !== "pending") {
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
    await sendProjectSystemMessage(ctx, args.projectId, [
      `Client updated: ${changed.join(", ")}.`,
    ]);
  },
});
