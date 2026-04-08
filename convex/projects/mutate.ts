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
    service: v.id("services"),
    pricing: v.union(v.literal("normal"), v.literal("UP")),
    files: v.optional(v.array(v.id("_storage"))),
    notes: v.string(),

    booking: v.object({
      startTime: v.number(),
      endTime: v.number(),
      date: v.number(),
    }),
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

    const now = Date.now();
    if (args.booking.startTime < now) {
      throw new ConvexError("Cannot book a date or time in the past.");
    }

    if (args.booking.endTime <= args.booking.startTime) {
      throw new ConvexError("End time must be after start time.");
    }

    if (service.availableDays && service.availableDays.length > 0) {
      const bookingDate = new Date(args.booking.date);
      const dayOfWeek = bookingDate.getDay();
      if (!service.availableDays.includes(dayOfWeek)) {
        throw new ConvexError(
          "Selected date falls on an unavailable day for this service.",
        );
      }
    }

    // create project
    const project = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      serviceType: args.serviceType,
      material: args.material,
      userId: userProfile._id,
      service: args.service,
      pricing: args.pricing,
      status: "pending",
      files: args.files,
      notes: args.notes,
    });

    // create proposed usage
    await ctx.db.insert("resourceUsage", {
      service: args.service,
      project: project,
      startTime: args.booking.startTime,
      endTime: args.booking.endTime,
      date: args.booking.date,
    });

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

    const messageContent = `New project created: ${args.name}\n\nService: ${service.name}\nDescription: ${args.description}\nService Type: ${args.serviceType}\nMaterial: ${args.material}\nPricing: ${args.pricing}\nNotes: ${args.notes}\nBooking: ${new Date(args.booking.date).toDateString()} from ${new Date(args.booking.startTime).toLocaleTimeString()} to ${new Date(args.booking.endTime).toLocaleTimeString()}`;

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
