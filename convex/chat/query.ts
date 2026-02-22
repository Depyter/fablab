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

export const getRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!userProfile) throw new Error("User profile does not exist!!");

    const roomMembers = await ctx.db
      .query("roomMembers")
      .withIndex("by_participantId", (q) =>
        q.eq("participantId", userProfile?._id),
      )
      .collect();

    // Wave 1: fetch all rooms in parallel
    const rooms = await Promise.all(
      roomMembers.map((member) => ctx.db.get(member.roomId)),
    );

    // Wave 2: fetch all last messages in parallel (no longer sequential per room)
    const lastMessages = await Promise.all(
      rooms.map((room) =>
        room?.lastMessageId ? ctx.db.get(room.lastMessageId) : null,
      ),
    );

    return rooms.map((room, i) => ({
      ...room,
      lastMessage: lastMessages[i] ?? null,
    }));
  },
});
