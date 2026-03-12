import { UserIdentity } from "convex/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type Role = "admin" | "maker" | "client";
type RoleCombo = Role | Role[];
/**
 * @param roles - check if user profile is any of the roles
 * @param user - current logged in user
 */
export async function checkAuthority(
  roles: RoleCombo,
  user: UserIdentity,
  ctx: QueryCtx | MutationCtx,
): Promise<boolean> {
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", user.subject))
    .first();

  if (!profile) throw new Error("User profile not found");

  return roles.includes(profile.role);
}

/**
 * Validates and claims a list of uploaded files.
 * Removes them from the `pendingFiles` table so they cannot be claimed twice.
 * * @param ctx - The mutation context (provides ctx.db)
 * @param storageIds - An array of Convex storage IDs to claim
 */
export async function claimFiles(
  ctx: { db: MutationCtx["db"] },
  storageIds: Id<"_storage">[],
): Promise<void> {
  await Promise.all(
    storageIds.map(async (storageId) => {
      const trackedFile = await ctx.db
        .query("files")
        .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
        .first();

      if (!trackedFile) {
        throw new Error(`File ${storageId} does not exist.`);
      }

      await ctx.db.patch(trackedFile._id, {
        status: "claimed",
      });
    }),
  );
}

export async function deleteFiles(
  ctx: MutationCtx,
  storageIds: Id<"_storage">[],
): Promise<void> {
  await Promise.all(
    storageIds.map(async (storageId) => {
      const trackedFile = await ctx.db
        .query("files")
        .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
        .first();

      if (!trackedFile) {
        throw new Error(`Tracked file ${storageId} does not exist`);
      }

      await ctx.storage.delete(trackedFile.storageId);
      await ctx.db.delete(trackedFile._id);
    }),
  );
}
