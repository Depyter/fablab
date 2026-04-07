import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";

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
    const workspaceName = `${userProfile.name}'s Workspace`;
    const existingRoom = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("name"), workspaceName))
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

    const now = Date.now();
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
