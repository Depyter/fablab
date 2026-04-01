import { v } from "convex/values";
import { authMutation, claimFiles } from "../helper";

export const sendMessage = authMutation({
  args: {
    content: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
    room: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    if (!ctx.user || !ctx.user?.name) throw new Error("Unauthorized");

    const message = await ctx.db.insert("messages", {
      content: args.content,
      file: args.files,
      sender: ctx.user.name,
      room: args.room,
    });

    if (args.files && args.files.length > 0) claimFiles(ctx, args.files);

    await ctx.db.patch("rooms", args.room, {
      lastMessageId: message,
    });
  },
});
