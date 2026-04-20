import { cache } from "react";
import { fetchAuthQuery, getToken, preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/../convex/_generated/api";

/**
 * Cached preload for the current user's profile.
 *
 * React's `cache()` deduplicates calls within the same request lifecycle, so
 * multiple Server Components / layouts that call this function will all share
 * the same `Preloaded` object without triggering additional network requests.
 *
 * Usage:
 *   const preloaded = await getPreloadedUserProfile();
 *   // Pass to a client component:  <Foo preloadedProfile={preloaded} />
 *   // Or read the value directly:  preloadedQueryResult(preloaded)
 */
export const getPreloadedUserProfile = cache(() =>
  preloadAuthQuery(api.users.getUserProfile, {}),
);

/**
 * Checks whether the current request has a valid authenticated session.
 * A token alone is not enough; we also verify it resolves to a user identity.
 */
export const hasValidSession = cache(async () => {
  const token = await getToken();
  if (!token) {
    return false;
  }

  try {
    const user = await fetchAuthQuery(api.auth.getCurrentUser, {});
    return Boolean(user);
  } catch {
    return false;
  }
});

/**
 * Returns a token only when the session is fully valid.
 */
export const getVerifiedSessionToken = cache(async () => {
  const token = await getToken();
  if (!token) {
    return null;
  }

  try {
    const user = await fetchAuthQuery(api.auth.getCurrentUser, {});
    return user ? token : null;
  } catch {
    return null;
  }
});
