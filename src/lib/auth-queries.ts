import { cache } from "react";
import { preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { preloadAuthQuery } from "./auth-server";

export const getPreloadedUserProfile = cache(() =>
  preloadAuthQuery(api.users.getUserProfile),
);

export const getUserProfile = cache(async () => {
  const preloaded = await getPreloadedUserProfile();
  return preloadedQueryResult(preloaded);
});
