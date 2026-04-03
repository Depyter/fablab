import { v } from "convex/values";
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
      await ctx.db.patch(args.threadId, {
        lastMessageText: args.content,
        lastMessageAt: now,
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
