"use client";

import { PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { AuthBoundary } from "@convex-dev/better-auth/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import { authClient } from "@/lib/auth-client";

function isAuthError(error: unknown): boolean {
  return (
    error instanceof ConvexError &&
    typeof error.data === "string" &&
    error.data.toLowerCase().includes("unauthenticated")
  );
}

export function ClientAuthBoundary({ children }: PropsWithChildren) {
  const router = useRouter();
  return (
    <AuthBoundary
      authClient={authClient}
      onUnauth={() => router.replace("/login")}
      getAuthUserFn={api.auth.getAuthUser}
      isAuthError={isAuthError}
    >
      {children}
    </AuthBoundary>
  );
}
