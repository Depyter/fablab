"use client";

import { PropsWithChildren } from "react";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { redirect } from "next/navigation";
import { api } from "@/../convex/_generated/api";
import { BannedUserDialog } from "@/components/ban-error-dialog";

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

function UnauthenticatedRedirect(): null {
  redirect("/login");
}

export function ClientAuthBoundary({ children }: PropsWithChildren) {
  return (
    <>
      <AuthLoading>{null}</AuthLoading>
      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>
      <Authenticated>
        <AuthBannedUserDialog />
        {children}
      </Authenticated>
    </>
  );
}
