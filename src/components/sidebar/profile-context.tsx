import * as React from "react";
import { Doc } from "@convex/_generated/dataModel";

type SidebarProfile = Doc<"userProfile"> | null | undefined;

const ProfileContext = React.createContext<SidebarProfile>(undefined);

export function ProfileProvider({
  profile,
  children,
}: React.PropsWithChildren<{
  profile: SidebarProfile;
}>) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const profile = React.useContext(ProfileContext);

  if (profile === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider.");
  }

  return profile;
}
