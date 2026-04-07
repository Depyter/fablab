import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";

export const sendMessage = authMutation({
  args: {
    content: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
    room: v.id("rooms"),
    threadId: v.optional(v.id("threads")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      content: args.content,
      file: args.files,
      sender: ctx.profile._id,
      room: args.room,
      threadId: args.threadId,
    });

    if (args.files && args.files.length > 0) claimFiles(ctx, args.files);

    const now = Date.now();

    await ctx.db.patch(args.room, {
      lastMessageText: args.content,
      lastMessageAt: now,
    });

    if (args.threadId) {
      const thread = await ctx.db.get(args.threadId);
      await ctx.db.patch(args.threadId, {
        lastMessageText: args.content,
        lastMessageAt: now,
        messageCount: (thread?.messageCount ?? 0) + 1,
      });
    }
  },
});

export const createThread = authMutation({
  args: {
    roomId: v.id("rooms"),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.insert("threads", {
      roomId: args.roomId,
      projectId: args.projectId,
      title: args.title,
      createdBy: ctx.profile._id,
      archived: "Active",
      lastMessageAt: Date.now(),
      messageCount: 1,
    });

    await ctx.db.insert("messages", {
      content: "Created thread",
      file: [],
      sender: ctx.profile._id,
      room: args.roomId,
      threadId: thread,
    });

    return thread;
  },
});

export const markThreadRead = authMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("Thread not found");

    const existingRead = await ctx.db
      .query("threadReads")
      .withIndex("by_userId_threadId", (q) =>
        q.eq("userId", ctx.profile._id).eq("threadId", args.threadId),
      )
      .first();

    if (existingRead) {
      await ctx.db.patch(existingRead._id, {
        lastReadMessageCount: thread.messageCount ?? 0,
      });
    } else {
      await ctx.db.insert("threadReads", {
        threadId: args.threadId,
        userId: ctx.profile._id,
        lastReadMessageCount: thread.messageCount ?? 0,
      });
    }
  },
});

export const updateRoomName = authMutation({
  args: {
    roomId: v.id("rooms"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");

    if (
      ctx.profile.role !== "admin" &&
      ctx.profile.role !== "maker" &&
      room.creator !== ctx.profile._id
    ) {
      throw new ConvexError("Unauthorized to update room settings");
    }

    await ctx.db.patch(args.roomId, { name: args.name });
  },
});

export const addNewMember = authMutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("userProfile"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");

    if (
      ctx.profile.role !== "admin" &&
      ctx.profile.role !== "maker" &&
      room.creator !== ctx.profile._id
    ) {
      throw new ConvexError("Unauthorized to update room settings");
    }

    const existing = await ctx.db
      .query("roomMembers")
      .withIndex("by_roomId_participantId", (q) =>
        q.eq("roomId", args.roomId).eq("participantId", args.userId),
      )
      .first();

    if (existing) {
      throw new ConvexError("User is already a member of this room");
    }

    await ctx.db.insert("roomMembers", {
      roomId: args.roomId,
      participantId: args.userId,
    });
  },
});

export const removeMember = authMutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("userProfile"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");

    if (
      ctx.profile.role !== "admin" &&
      ctx.profile.role !== "maker" &&
      room.creator !== ctx.profile._id
    ) {
      throw new ConvexError("Unauthorized to update room settings");
    }

    const existing = await ctx.db
      .query("roomMembers")
      .withIndex("by_roomId_participantId", (q) =>
        q.eq("roomId", args.roomId).eq("participantId", args.userId),
      )
      .first();

    if (!existing) {
      throw new ConvexError("User is not a member of this room");
    }

    await ctx.db.delete(existing._id);
  },
});
