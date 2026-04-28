"use client";

import { PropsWithChildren } from "react";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { BannedUserDialog } from "@/components/ban-error-dialog";

function isAuthError(error: unknown): boolean {
  return (
    error instanceof ConvexError &&
    typeof error.data === "string" &&
    error.data.toLowerCase().includes("unauthenticated")
  );
}

function AuthBannedUserDialog() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  if (!user?.banned) return null;

  return (
    <BannedUserDialog
      reason={user.banReason}
      expiresAt={user.banExpires}
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
