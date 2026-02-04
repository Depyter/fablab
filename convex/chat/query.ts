import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

// Use paginated query
export const getRoomMessages = query({
  args: { paginationOpts: paginationOptsValidator, room: v.id("rooms") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("room", args.room))
      .order("desc")
      .paginate(args.paginationOpts);

    return messages;
  },
});
