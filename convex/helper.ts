import { UserIdentity } from "convex/server";
import { QueryCtx, MutationCtx, query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  customQuery,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";
import { rateLimiter, type RateLimitName } from "./ratelimit";

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

  if (!profile) throw new ConvexError("User profile not found");

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
        throw new ConvexError(`File ${storageId} does not exist.`);
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
        throw new ConvexError(`Tracked file ${storageId} does not exist`);
      }

      await ctx.storage.delete(trackedFile.storageId);
      await ctx.db.delete(trackedFile._id);
    }),
  );
}

export function slugify(str: string): string {
  return str.trim().replace(/\s+/g, "-");
}

export async function ensureAuthentication(ctx: QueryCtx | MutationCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new ConvexError("Unauthenticated call");
  }
  return user;
}

export const authQuery = customQuery(query, {
  args: {},
  input: async (ctx, args, opts: { role?: RoleCombo } = {}) => {
    const user = await ensureAuthentication(ctx);

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!profile) throw new ConvexError("User profile not found");

    if (opts.role) {
      const roles = Array.isArray(opts.role) ? opts.role : [opts.role];
      if (!roles.includes(profile.role)) {
        throw new ConvexError(
          "Unauthorized: You do not have the correct permissions to query.",
        );
      }
    }

    return { ctx: { user, profile }, args: {} };
  },
});

export const authMutation = customMutation(mutation, {
  args: {},
  input: async (
    ctx,
    args,
    opts: { role?: RoleCombo; rateLimit?: RateLimitName } = {},
  ) => {
    const user = await ensureAuthentication(ctx);

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!profile) throw new ConvexError("User profile not found");

    if (opts.rateLimit) {
      await rateLimiter.limit(ctx, opts.rateLimit, {
        key: profile._id,
        throws: true,
      });
    }

    if (opts.role) {
      const roles = Array.isArray(opts.role) ? opts.role : [opts.role];
      if (!roles.includes(profile.role)) {
        throw new ConvexError(
          "Unauthorized: You do not have the correct permissions to mutate.",
        );
      }
    }

    return { ctx: { user, profile }, args: {} };
  },
});

export const publicQuery = query;
export const publicMutation = mutation;
