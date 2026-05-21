import { v, ConvexError } from "convex/values";
import { authMutation, claimFiles } from "../helper";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

export const sendMessage = authMutation({
  args: {
    content: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
    room: v.id("rooms"),
    threadId: v.id("threads"),
  },
  rateLimit: "sendMessage",
  handler: async (ctx, args) => {
    // Filter out any attachment that has already been flagged by moderation.
    let cleanFiles = args.files;
    if (args.files && args.files.length > 0) {
      const fileStatuses = await Promise.all(
        args.files.map(async (storageId) => {
          const f = await ctx.db
            .query("files")
            .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
            .first();
          return f?.status === "flagged" ? null : storageId;
        }),
      );
      cleanFiles = fileStatuses.filter(Boolean) as typeof args.files;
    }

    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      file: cleanFiles,
      sender: ctx.profile._id,
      room: args.room,
      threadId: args.threadId,
    });

    if (cleanFiles && cleanFiles.length > 0) {
      await claimFiles(ctx, cleanFiles);
    }

    const now = Date.now();

    await ctx.db.patch(args.room, {
      lastMessageText: args.content,
      lastMessageAt: now,
    });

    const thread = await ctx.db.get(args.threadId);
    await ctx.db.patch(args.threadId, {
      lastMessageText: args.content,
      lastMessageAt: now,
      messageCount: (thread?.messageCount ?? 0) + 1,
    });

    // Schedule async moderation for the message text and any attached files.
    // Only schedule when OPENAI_API_KEY is configured — in test environments
    // (or without a key) the scheduler run would fail and leak unhandled
    // rejections in convex-test's fake database.
    if (process.env.OPENAI_API_KEY) {
      await ctx.scheduler.runAfter(0, internal.chat.mutate.moderateMessage, {
        messageId,
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
  role: ["admin", "maker"],
  args: {
    roomId: v.id("rooms"),
    userId: v.id("userProfile"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");

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
  role: ["admin", "maker"],
  args: {
    roomId: v.id("rooms"),
    userId: v.id("userProfile"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");

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

// ── Internal: moderation helpers for messages ─────────────────────────────

export const getMessageInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const moderateMessage = internalAction({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(
      internal.chat.mutate.getMessageInternal,
      { messageId: args.messageId },
    );
    if (!message) return;

    const payload: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];

    // Submit the message text if it's non-empty.
    if (message.content.trim()) {
      payload.push({ type: "text", text: message.content });
    }

    // Submit attached file names (text) and image URLs for visual moderation.
    if (message.file && message.file.length > 0) {
      const fileRecords = await Promise.all(
        message.file.map((storageId) =>
          ctx.runQuery(internal.files.getFileByStorageId, { storageId }),
        ),
      );

      for (const fileRecord of fileRecords) {
        if (!fileRecord) continue;
        payload.push({ type: "text", text: fileRecord.originalName });
        if (fileRecord.type.startsWith("image/")) {
          const url = await ctx.storage.getUrl(fileRecord.storageId);
          if (url) {
            payload.push({
              type: "image_url",
              image_url: { url },
            });
          }
        }
      }
    }

    if (payload.length === 0) return;

    const result = await ctx.runAction(internal.moderation.moderateContent, {
      items: payload,
    });

    await ctx.runMutation(internal.moderation.handleMessageModerationResult, {
      messageId: args.messageId,
      flagged: result.flagged,
      categories: result.categories,
    });
  },
});
