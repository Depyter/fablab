import posthog from "posthog-js";
import { useEffect } from "react";

interface Profile {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function usePostHogIdentify(profile: Profile | null | undefined) {
  useEffect(() => {
    if (!profile) return;
    posthog.identify(profile._id, {
      name: profile.name,
      email: profile.email,
      role: profile.role,
    });
  }, [profile]);
}
