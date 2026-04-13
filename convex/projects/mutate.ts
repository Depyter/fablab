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
    pricing: v.union(v.literal("normal"), v.literal("UP")),
    files: v.optional(v.array(v.id("_storage"))),
    notes: v.string(),

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

    if (service.availableDays && service.availableDays.length > 0) {
      const localDateString = new Date(finalBooking.date).toLocaleString(
        "en-US",
        { timeZone: "Asia/Manila" },
      );
      const dayOfWeek = new Date(localDateString).getDay();
      if (!service.availableDays.includes(dayOfWeek)) {
        throw new ConvexError(
          "Selected date falls on an unavailable day for this service.",
        );
      }
    }

    let costBreakdown = undefined;
    if (args.sharedUsageId && service.pricing.type === "FIXED") {
      const isUp = args.pricing === "UP";
      const amount =
        isUp && service.pricing.upAmount !== undefined
          ? service.pricing.upAmount
          : service.pricing.amount;
      costBreakdown = {
        baseFee: amount,
        materialCost: 0,
        timeCost: 0,
        total: amount,
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
      service: args.service,
      pricing: args.pricing,
      status: "pending",
      files: args.files,
      notes: args.notes,
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
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { projectId, status } = args;
    const updates: Partial<{
      status: "pending" | "approved" | "rejected" | "completed";
    }> = {};

    if (status !== undefined) updates.status = status;

    await ctx.db.patch(projectId, updates);
  },
});

export const cancelOwnProject = authMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found.");

    if (project.userId !== ctx.profile._id) {
      throw new ConvexError("You can only cancel your own projects.");
    }

    if (project.status !== "pending") {
      throw new ConvexError("Only pending projects can be cancelled.");
    }

    await ctx.db.patch(project._id, {
      status: "rejected",
    });
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
    const isUp = project.pricing === "UP";

    if (service.pricing.type === "COMPOSITE") {
      baseFee =
        isUp && service.pricing.upBaseFee !== undefined
          ? service.pricing.upBaseFee
          : service.pricing.baseFee;
      const timeRate =
        isUp && service.pricing.upTimeRate !== undefined
          ? service.pricing.upTimeRate
          : service.pricing.timeRate;

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

      if (args.materialsUsed && args.materialsUsed.length > 0) {
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
    } else if (service.pricing.type === "PER_UNIT") {
      baseFee =
        isUp && service.pricing.upBaseFee !== undefined
          ? service.pricing.upBaseFee
          : service.pricing.baseFee;
      const ratePerUnit =
        isUp && service.pricing.upRatePerUnit !== undefined
          ? service.pricing.upRatePerUnit
          : service.pricing.ratePerUnit;

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
      baseFee =
        isUp && service.pricing.upAmount !== undefined
          ? service.pricing.upAmount
          : service.pricing.amount;
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
