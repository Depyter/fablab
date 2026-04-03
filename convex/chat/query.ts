import { paginationOptsValidator } from "convex/server";
import { authQuery } from "../helper";
import { checkRoomMembership } from "./helper";
import { v } from "convex/values";

export const getRoom = authQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    checkRoomMembership(args.roomId, ctx, ctx.user);
    return await ctx.db.get(args.roomId);
  },
});
// Use paginated query
export const getRoomMessages = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    room: v.id("rooms"),
    threadId: v.optional(v.id("threads")),
  },
  handler: async (ctx, args) => {
    checkRoomMembership(args.room, ctx, ctx.user);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_and_thread", (q) =>
        q.eq("room", args.room).eq("threadId", args.threadId),
      )
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

export const getRooms = authQuery({
  args: {},
  handler: async (ctx) => {
    const roomMembers = await ctx.db
      .query("roomMembers")
      .withIndex("by_participantId", (q) =>
        q.eq("participantId", ctx.profile._id),
      )
      .collect();

    // Wave 1: fetch all rooms in parallel
    const rooms = await Promise.all(
      roomMembers.map((member) => ctx.db.get(member.roomId)),
    );

    const results = rooms.filter((r): r is NonNullable<typeof r> => r !== null);

    results.sort((a, b) => {
      const timeA = a.lastMessageAt ?? a._creationTime;
      const timeB = b.lastMessageAt ?? b._creationTime;
      return timeB - timeA;
    });

    return results;
  },
});

export const getThreads = authQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .collect();
  },
});
