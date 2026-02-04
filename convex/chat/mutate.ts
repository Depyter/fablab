import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    content: v.string(),
    file: v.optional(v.string()),
    sender: v.string(),
    room: v.id("rooms"),
  },
  handler: async (ctx, args) => {},
});
