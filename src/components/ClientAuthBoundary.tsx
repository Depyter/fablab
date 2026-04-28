"use client";

import { PropsWithChildren } from "react";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { BannedUserDialog } from "@/components/ban-error-dialog";
import { Authenticated, AuthLoading, useQuery } from "convex/react";

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
      <AuthLoading>
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-fab-magenta shadow-[4px_4px_0_0_#000]" />
            <p className="text-lg font-black uppercase tracking-tighter">
              Authenticating...
            </p>
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <AuthBannedUserDialog />
        {children}
      </Authenticated>
    </AuthBoundary>
  );
}
