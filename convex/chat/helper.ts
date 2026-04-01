import { UserIdentity } from "convex/server";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

export async function checkRoomMembership(
  roomId: Id<"rooms">,
  ctx: QueryCtx | MutationCtx,
  user: UserIdentity,
) {
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", user.subject))
    .first();

  if (!profile) throw new ConvexError("User exist but no profile is created!");

  const membership = await ctx.db
    .query("roomMembers")
    .withIndex("by_roomId_participantId", (q) =>
      q.eq("roomId", roomId).eq("participantId", profile._id),
    )
    .first();

  if (!membership) throw new ConvexError("Unauthorized access to a room.");

  return;
}
