import { cache } from "react";
import { preloadAuthQuery } from "@/lib/auth-server";
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
