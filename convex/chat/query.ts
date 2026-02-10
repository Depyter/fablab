import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { authComponent } from "../auth";

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

export const getRooms = query({
  args: {},
  handler: async (ctx) => {
    const betterAuthUser = await authComponent.getAuthUser(ctx);
    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", betterAuthUser._id))
      .first();

    if (!userProfile) throw new Error("User profile does not exist!!");

    const rooms = await ctx.db
      .query("roomMembers")
      .withIndex("by_participantId", (q) =>
        q.eq("participantId", userProfile?._id),
      )
      .first();

    return rooms;
  },
});
