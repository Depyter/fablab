import { UserIdentity } from "convex/server";
import { QueryCtx, MutationCtx } from "./_generated/server";

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
