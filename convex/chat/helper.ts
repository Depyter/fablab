import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Check whether a user has access to a room.
 *
 * Admins and makers have **implicit** access to all rooms.
 * Only client users require an explicit roomMembers record.
 */
export async function checkRoomMembership(
  roomId: Id<"rooms">,
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"userProfile">,
) {
  // Admins and makers have implicit access to all rooms
  if (profile.role === "admin" || profile.role === "maker") return;

  const membership = await ctx.db
    .query("roomMembers")
    .withIndex("by_roomId_participantId", (q) =>
      q.eq("roomId", roomId).eq("participantId", profile._id),
    )
    .first();

  if (!membership) throw new ConvexError("Unauthorized access to a room.");
}
