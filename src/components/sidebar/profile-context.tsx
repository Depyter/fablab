import * as React from "react";
import { Doc } from "@convex/_generated/dataModel";

export type CurrentUserProfile = Doc<"userProfile"> & {
  profilePicUrl?: string | null;
};

interface ProfileContextType {
  profile: CurrentUserProfile | null | undefined;
  isPending: boolean;
}

const ProfileContext = React.createContext<ProfileContextType | null>(null);

export function ProfileProvider({
  profile,
  isPending,
  children,
}: React.PropsWithChildren<{
  profile: CurrentUserProfile | null | undefined;
  isPending: boolean;
}>) {
  return (
    <ProfileContext.Provider value={{ profile, isPending }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = React.useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider.");
  }

  return context;
}
