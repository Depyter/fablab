import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";
import { FILE_CATEGORIES } from "../constants";

// Initialize a project
export const createProject = authMutation({
  args: {
    name: v.string(),
    description: v.string(),
    serviceType: v.union(v.literal("self-service"), v.literal("full-service")),
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
    // assume user has already logged in
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Unauthorized");

    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!userProfile) throw new ConvexError("User not authorized");

    // get service name for alias
    const service = await ctx.db.get(args.service);
    if (!service) throw new ConvexError("Service not found!");

    if (
      args.files &&
      args.files.length > 0 &&
      service.fileTypes &&
      service.fileTypes.length > 0
    ) {
      const allowedMimes = service.fileTypes.flatMap(
        (cat) => FILE_CATEGORIES[cat] || [cat],
      );

      for (const fileId of args.files) {
        const fileDoc = await ctx.db
          .query("files")
          .withIndex("by_storageId", (q) => q.eq("storageId", fileId))
          .first();

        if (fileDoc && !allowedMimes.includes(fileDoc.type)) {
          throw new ConvexError(
            `File type ${fileDoc.type} is not allowed for this service.`,
          );
        }
      }
    }

    let finalBooking = args.booking;
    let sharedUsage = null;

    if (args.sharedUsageId) {
      sharedUsage = await ctx.db.get(args.sharedUsageId);
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

      finalBooking = {
        startTime: sharedUsage.startTime,
        endTime: sharedUsage.endTime,
        date: sharedUsage.date,
      };
    } else if (!finalBooking) {
      throw new ConvexError("Booking details are required.");
    }

    const now = Date.now();
    if (finalBooking.startTime < now) {
      throw new ConvexError("Cannot book a date or time in the past.");
    }

    if (finalBooking.endTime <= finalBooking.startTime) {
      throw new ConvexError("End time must be after start time.");
    }

    if (
      service.serviceCategory.type === "FABRICATION" &&
      service.serviceCategory.availableDays &&
      service.serviceCategory.availableDays.length > 0
    ) {
      const localDateString = new Date(finalBooking.date).toLocaleString(
        "en-US",
        { timeZone: "Asia/Manila" },
      );
      const dayOfWeek = new Date(localDateString).getDay();
      if (!service.serviceCategory.availableDays.includes(dayOfWeek)) {
        throw new ConvexError(
          "Selected date falls on an unavailable day for this service.",
        );
      }
    }

    let costBreakdown = undefined;
    if (args.sharedUsageId && service.pricing.type === "FIXED") {
      let amount = service.pricing.amount;
      if (service.pricing.variants) {
        const variant = service.pricing.variants.find(
          (v) => v.name === args.pricing,
        );
        if (variant) amount = variant.amount;
      }

      const baseFee = args.serviceType === "full-service" ? amount : 0;

      costBreakdown = {
        baseFee,
        materialCost: 0,
        timeCost: 0,
        total: baseFee,
      };
    }

    // create project
    const project = await ctx.db.insert("projects", {
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

    if (args.sharedUsageId && sharedUsage) {
      await ctx.db.patch(args.sharedUsageId, {
        projects: [...sharedUsage.projects, project],
      });
    } else {
      // create proposed usage
      await ctx.db.insert("resourceUsage", {
        service: args.service,
        usageMode: "EXCLUSIVE",
        projects: [project],
        startTime: finalBooking.startTime,
        endTime: finalBooking.endTime,
        date: finalBooking.date,
      });
    }

    // Find if the user already has a dedicated workspace room
    const workspaceName = `${userProfile.name}'s Channel`;
    const existingRoom = await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("creator", userProfile._id))
      .filter((q) => q.eq(q.field("createdVia"), "Project"))
      .first();

    let roomId;
    const admins = await ctx.db
      .query("userProfile")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    if (existingRoom) {
      roomId = existingRoom._id;
    } else {
      roomId = await ctx.db.insert("rooms", {
        name: workspaceName,
        color: "yellow",
        creator: ctx.profile._id,
        createdVia: "Project",
      });

      await ctx.db.insert("roomMembers", {
        roomId: roomId,
        participantId: userProfile._id,
      });

      for (const admin of admins) {
        if (admin._id !== userProfile._id) {
          await ctx.db.insert("roomMembers", {
            roomId: roomId,
            participantId: admin._id,
          });
        }
      }

      // Create a main workspace thread not associated with any project
      const welcomeContent = `Welcome to ${workspaceName}! This is your main room for general inquiries.`;
      const generalThreadId = await ctx.db.insert("threads", {
        roomId: roomId,
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
    }

    const messageContent = `New project created: ${args.name}\n\nService: ${service.name}\nDescription: ${args.description}\nService Type: ${args.serviceType}\nMaterial: ${args.material}\nPricing: ${args.pricing}\nNotes: ${args.notes}\nBooking: ${new Date(finalBooking.date).toDateString()} from ${new Date(finalBooking.startTime).toLocaleTimeString()} to ${new Date(finalBooking.endTime).toLocaleTimeString()}`;

    // Create a thread for the project
    const threadId = await ctx.db.insert("threads", {
      roomId: roomId,
      projectId: project,
      title: args.name,
      createdBy: userProfile._id,
      archived: "Active",
      lastMessageText: messageContent,
      lastMessageAt: now,
      messageCount: 1,
    });

    // create initial system message inside the thread
    await ctx.db.insert("messages", {
      room: roomId,
      threadId: threadId,
      content: messageContent,
      sender: "System",
      file: args.files,
    });

    if (args.files && args.files.length > 0) {
      claimFiles(ctx, args.files);
    }

    await ctx.db.patch(roomId, {
      lastMessageText: messageContent,
      lastMessageAt: now,
    });

    return { roomId, threadId };
  },
});

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
      assignedMaker: NonNullable<typeof args.makerId>;
    }> = {};

    if (status !== undefined) updates.status = status;

    if (makerId !== undefined) {
      const makerProfile = await ctx.db.get(makerId);
      if (!makerProfile || makerProfile.role !== "maker") {
        throw new ConvexError("Assigned user must be a maker");
      }
      updates.assignedMaker = makerId;
    }

    await ctx.db.patch(projectId, updates);

    if (makerId !== undefined) {
      const project = await ctx.db.get(projectId);
      if (project) {
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_service", (q) => q.eq("service", project.service))
          .collect();

        const usage = usages.find((u) => u.projects.includes(project._id));
        if (usage) {
          await ctx.db.patch(usage._id, { maker: makerId });
        }
      }
    }
  },
});

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
      project.status === "completed" ||
      project.status === "rejected" ||
      project.status === "cancelled"
    ) {
      throw new ConvexError("Cannot cancel a project in its current status.");
    }

    await ctx.db.patch(args.projectId, { status: "cancelled" });
  },
});

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

    let timeCost = 0;
    let materialCost = 0;
    let baseFee = 0;

    const hours = args.actualDurationMs / (1000 * 60 * 60);
    const minutes = args.actualDurationMs / (1000 * 60);

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

      if (project.serviceType !== "full-service") {
        baseFee = 0;
      }

      if (
        service.pricing.unitName === "hour" ||
        service.pricing.unitName === "hr"
      ) {
        timeCost = hours * timeRate;
      } else if (
        service.pricing.unitName === "minute" ||
        service.pricing.unitName === "min"
      ) {
        timeCost = minutes * timeRate;
      } else {
        timeCost = hours * timeRate;
      }
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

      if (project.serviceType !== "full-service") {
        baseFee = 0;
      }

      if (
        service.pricing.unitName === "hour" ||
        service.pricing.unitName === "hr"
      ) {
        timeCost = hours * ratePerUnit;
      } else if (
        service.pricing.unitName === "minute" ||
        service.pricing.unitName === "min"
      ) {
        timeCost = (args.actualDurationMs / (1000 * 60)) * ratePerUnit;
      }
    } else if (service.pricing.type === "FIXED") {
      baseFee = service.pricing.amount;
      if (service.pricing.variants) {
        const variant = service.pricing.variants.find(
          (v) => v.name === project.pricing,
        );
        if (variant) {
          baseFee = variant.amount;
        }
      }

      if (project.serviceType !== "full-service") {
        baseFee = 0;
      }
    }

    if (
      project.material === "buy-from-lab" &&
      args.materialsUsed &&
      args.materialsUsed.length > 0
    ) {
      for (const usage of args.materialsUsed) {
        const material = await ctx.db.get(usage.materialId);
        if (material) {
          const rate = material.pricePerUnit || 0;
          materialCost += usage.amountUsed * rate;

          const newStock = Math.max(
            0,
            material.currentStock - usage.amountUsed,
          );
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
      }
    }

    const total = baseFee + timeCost + materialCost;

    await ctx.db.patch(args.projectId, {
      status: "completed",
      costBreakdown: {
        baseFee,
        timeCost,
        materialCost,
        total,
      },
    });

    const usages = await ctx.db
      .query("resourceUsage")
      .withIndex("by_service", (q) => q.eq("service", project.service))
      .collect();

    const usage = usages.find((u) => u.projects.includes(project._id));
    if (usage && args.materialsUsed) {
      await ctx.db.patch(usage._id, {
        materialsUsed: args.materialsUsed,
      });
    }
  },
});
