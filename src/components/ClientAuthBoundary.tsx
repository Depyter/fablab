"use client";

import { PropsWithChildren } from "react";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import { useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import { BannedUserDialog } from "@/components/ban-error-dialog";
import { authClient } from "@/lib/auth-client";

function isAuthError(error: unknown): boolean {
  return (
    error instanceof ConvexError &&
    typeof error.data === "string" &&
    error.data.toLowerCase().includes("unauthenticated")
  );
}

function AuthBannedUserDialog() {
  const user = useQuery(api.users.getUserProfile);

  if (!user?.banned) return null;

  return (
    <BannedUserDialog
      reason={user.banReason ?? undefined}
      expiresAt={user.banExpires ?? undefined}
      actionLabel="Sign Out"
    />
  );
}

export function ClientAuthBoundary({ children }: PropsWithChildren) {
  return (
    <AuthBoundary
      authClient={authClient}
      onUnauth={() => {
        window.location.replace("/login");
      }}
      getAuthUserFn={api.auth.getAuthUser}
      isAuthError={isAuthError}
    >
      <AuthBannedUserDialog />
      {children}
    </AuthBoundary>
  );
}
