import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";
import { Id, Doc } from "../_generated/dataModel";
import {
  BookingWindow,
  resolveService,
  validateFileTypes,
  resolveBookingFromSharedUsage,
  validateBookingTiming,
  validateFabricationAvailability,
  computeSharedFixedCostBreakdown,
  handleSharedResourceUsage,
  handleWorkshopResourceUsage,
  handleExclusiveResourceUsage,
  incrementWorkshopSlot,
  decrementWorkshopSlot,
  ensureProjectRoom,
  createProjectThread,
  computeCompletionCost,
  consumeMaterials,
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

    // ── 4. Compute provisional cost (shared + fixed only) ───────────────────
    const costBreakdown = args.sharedUsageId
      ? computeSharedFixedCostBreakdown(service, args.pricing, args.serviceType)
      : undefined;

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
      );
    } else {
      await handleExclusiveResourceUsage(ctx, args.service, booking, projectId);
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
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    makerId: v.optional(v.id("userProfile")),
  },
  handler: async (ctx, args) => {
    const { projectId, status, makerId } = args;

    const updates: Partial<{
      status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
      assignedMaker: Id<"userProfile">;
    }> = {};

    if (status !== undefined) updates.status = status;

    if (makerId !== undefined) {
      const makerProfile = await ctx.db.get(makerId);
      if (!makerProfile || makerProfile.role !== "maker") {
        throw new ConvexError("Assigned user must be a maker");
      }
      updates.assignedMaker = makerId;
    }

    const existingProject = await ctx.db.get(projectId);
    await ctx.db.patch(projectId, updates);
    const project = await ctx.db.get(projectId);

    // ── Workshop cancellation / rejection: release the slot ─────────────────
    if (
      project &&
      existingProject &&
      project.serviceType === "workshop" &&
      (status === "cancelled" || status === "rejected") &&
      existingProject.status !== "cancelled" &&
      existingProject.status !== "rejected"
    ) {
      const service = await ctx.db.get(project.service);
      if (service && service.serviceCategory.type === "WORKSHOP") {
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_service", (q) => q.eq("service", project.service))
          .collect();
        const usage = usages.find((u) => u.projects.includes(project._id));

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

    // ── Assign maker to resource usage ───────────────────────────────────────
    if (makerId !== undefined && project) {
      const usages = await ctx.db
        .query("resourceUsage")
        .withIndex("by_service", (q) => q.eq("service", project.service))
        .collect();
      const usage = usages.find((u) => u.projects.includes(project._id));
      if (usage) {
        await ctx.db.patch(usage._id, { maker: makerId });
      }
    }
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

    await ctx.db.patch(args.projectId, { status: "cancelled" });

    // ── Workshop: release the slot ────────────────────────────────────────────
    if (project.serviceType === "workshop") {
      const service = await ctx.db.get(project.service);
      if (service && service.serviceCategory.type === "WORKSHOP") {
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_service", (q) => q.eq("service", project.service))
          .collect();
        const usage = usages.find((u) => u.projects.includes(project._id));

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
    const { baseFee, timeCost } = computeCompletionCost(
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
    const total = baseFee + timeCost + materialCost;

    await ctx.db.patch(args.projectId, {
      status: "completed",
      costBreakdown: { baseFee, timeCost, materialCost, total },
    });

    // ── 4. Record materials on the usage log ─────────────────────────────────
    if (args.materialsUsed) {
      const usages = await ctx.db
        .query("resourceUsage")
        .withIndex("by_service", (q) => q.eq("service", project.service))
        .collect();
      const usage = usages.find((u) => u.projects.includes(project._id));
      if (usage) {
        await ctx.db.patch(usage._id, { materialsUsed: args.materialsUsed });
      }
    }
  },
});
