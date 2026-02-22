import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { authComponent } from "../auth";

export const sendMessage = mutation({
  args: {
    content: v.string(),
    file: v.optional(v.id("_storage")),
    room: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    // do an auth check
    const user = await ctx.auth.getUserIdentity();

    if (!user || !user?.name) throw new Error("Unauthorized");

    const message = await ctx.db.insert("messages", {
      content: args.content,
      file: args.file,
      sender: user.name,
      room: args.room,
    });

    await ctx.db.patch("rooms", args.room, {
      lastMessageId: message,
    });
  },
});

export const createRoom = mutation({
  args: {
    name: v.string(),
    participants: v.array(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {},
});

export const updateRoom = mutation({
  args: {
    name: v.string(),
    participants: v.array(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {},
});
