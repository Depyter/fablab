import { cache } from "react";
import { preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { preloadAuthQuery } from "./auth-server";

/**
 * Preload the current user's profile once per request.
 * React cache() deduplicates calls across the layout tree so
 * dashboard/layout.tsx and dashboard/(manage)/layout.tsx share
 * the same fetch result without a second network round-trip.
 */
export const getPreloadedUserProfile = cache(() =>
  preloadAuthQuery(api.users.getUserProfile),
);

export const getUserProfile = cache(async () => {
  const preloaded = await getPreloadedUserProfile();
  return preloadedQueryResult(preloaded);
});
