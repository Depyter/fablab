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
          let senderName = message.sender;
          let senderProfilePicUrl: string | null = null;
          const senderId = ctx.db.normalizeId("userProfile", message.sender);
          if (senderId) {
            const profile = await ctx.db.get(senderId);
            if (profile) {
              senderName = profile.name;
              if (profile.profilePic) {
                senderProfilePicUrl = await ctx.storage.getUrl(
                  profile.profilePic,
                );
              }
            }
          }

          if (!message.file || message.file.length === 0) {
            return {
              ...message,
              sender: senderName,
              senderProfilePicUrl,
              files: [],
              fileUrl: null,
              fileType: null,
            };
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
            sender: senderName,
            senderProfilePicUrl,
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

    const validRooms = rooms.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    const roomsWithThreads = await Promise.all(
      validRooms.map(async (room) => {
        const threads = await ctx.db
          .query("threads")
          .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
          .order("desc")
          .collect();

        let roomUnreadCount = 0;

        const threadsWithUnreads = await Promise.all(
          threads.map(async (thread) => {
            const threadRead = await ctx.db
              .query("threadReads")
              .withIndex("by_userId_threadId", (q) =>
                q.eq("userId", ctx.profile._id).eq("threadId", thread._id),
              )
              .first();

            const lastReadMessageCount = threadRead?.lastReadMessageCount ?? 0;
            const messageCount = thread.messageCount ?? 0;
            const unreadCount = Math.max(
              0,
              messageCount - lastReadMessageCount,
            );

            roomUnreadCount += unreadCount;

            return { ...thread, unreadCount };
          }),
        );

        return {
          ...room,
          unreadCount: roomUnreadCount,
          threads: threadsWithUnreads,
        };
      }),
    );

    roomsWithThreads.sort((a, b) => {
      const timeA = a.lastMessageAt ?? a._creationTime;
      const timeB = b.lastMessageAt ?? b._creationTime;
      return timeB - timeA;
    });

    return roomsWithThreads;
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

export const getRoomMembers = authQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("roomMembers")
      .withIndex("by_roomId_participantId", (q) => q.eq("roomId", args.roomId))
      .collect();

    const members = await Promise.all(
      memberships.map((m) => ctx.db.get(m.participantId)),
    );

    const validMembers = members.filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

    return await Promise.all(
      validMembers.map(async (member) => ({
        ...member,
        profilePicUrl: member.profilePic
          ? await ctx.storage.getUrl(member.profilePic)
          : null,
      })),
    );
  },
});

export const getAddableUsers = authQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("roomMembers")
      .withIndex("by_roomId_participantId", (q) => q.eq("roomId", args.roomId))
      .collect();

    const memberIds = new Set(memberships.map((m) => m.participantId));

    const allUsers = await ctx.db.query("userProfile").collect();

    return allUsers.filter((u) => !memberIds.has(u._id));
  },
});
