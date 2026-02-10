"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

export function ConvexClientProvider({
  children,
  initialToken,
  expectAuth = false,
}: {
  children: ReactNode;
  initialToken?: string | null;
  expectAuth?: boolean;
}) {
  const convex = useMemo(
    () =>
      new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
        expectAuth,
      }),
    [expectAuth],
  );

  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
