"use client";

import * as React from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import type { Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";

function useSidebarProfile(
  preloadedProfile: Preloaded<typeof api.users.getUserProfile>,
) {
  return usePreloadedAuthQuery(preloadedProfile);
}

type SidebarProfile = ReturnType<typeof useSidebarProfile>;

const ProfileContext = React.createContext<SidebarProfile | undefined>(undefined);

export function ProfileProvider({
  preloadedProfile,
  children,
}: React.PropsWithChildren<{
  preloadedProfile: Preloaded<typeof api.users.getUserProfile>;
}>) {
  const profile = useSidebarProfile(preloadedProfile);

  return (
    <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const profile = React.useContext(ProfileContext);

  if (profile === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider.");
  }

  return profile;
}
