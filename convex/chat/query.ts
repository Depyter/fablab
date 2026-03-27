import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

// Use paginated query
export const getRoomMessages = query({
  args: { paginationOpts: paginationOptsValidator, room: v.id("rooms") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("room", args.room))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...messages,
      page: await Promise.all(
        messages.page.map(async (message) => {
          if (!message.file || message.file.length === 0) {
            return { ...message, files: [], fileUrl: null, fileType: null };
          }

          const filesData = await Promise.all(
            message.file.map(async (fileId) => {
              const [url, fileRecord] = await Promise.all([
                ctx.storage.getUrl(fileId),
                ctx.db
                  .query("files")
                  .withIndex("by_storageId", (q) => q.eq("storageId", fileId))
                  .first(),
              ]);
              return {
                fileUrl: url,
                fileType: fileRecord?.type ?? null,
                originalName: fileRecord?.originalName ?? null,
              };
            }),
          );

          return {
            ...message,
            files: filesData,
            // Legacy single-file fields kept for backward compatibility
            fileUrl: filesData[0]?.fileUrl ?? null,
            fileType: filesData[0]?.fileType ?? null,
            originalName: filesData[0]?.originalName ?? null,
          };
        }),
      ),
    };
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

    const results = rooms
      .map((room, i) => {
        if (!room) return null;
        return {
          ...room,
          lastMessage: lastMessages[i] ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    results.sort((a, b) => {
      const timeA = a.lastMessage?._creationTime ?? a._creationTime;
      const timeB = b.lastMessage?._creationTime ?? b._creationTime;
      return timeB - timeA;
    });

    return results;
  },
});
