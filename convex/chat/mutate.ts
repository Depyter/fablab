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
    const betterAuthUser = await authComponent.getAuthUser(ctx);

    if (!betterAuthUser) throw new Error("Unauthorized");

    await ctx.db.insert("messages", {
      content: args.content,
      file: args.file,
      sender: betterAuthUser.name,
      room: args.room,
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
