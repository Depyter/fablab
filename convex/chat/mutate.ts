import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { claimFiles } from "../helper";

export const sendMessage = mutation({
  args: {
    content: v.string(),
    files: v.optional(v.array(v.id("_storage"))),
    room: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    // do an auth check
    const user = await ctx.auth.getUserIdentity();

    if (!user || !user?.name) throw new Error("Unauthorized");

    const message = await ctx.db.insert("messages", {
      content: args.content,
      file: args.files,
      sender: user.name,
      room: args.room,
    });

    if (args.files && args.files.length > 0) claimFiles(ctx, args.files);

    await ctx.db.patch("rooms", args.room, {
      lastMessageId: message,
    });
  },
});
