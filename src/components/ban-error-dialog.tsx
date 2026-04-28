"use client";

import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authClient } from "@/lib/auth-client";

interface BannedUserDialogProps {
  message?: string;
  reason?: string | null;
  expiresAt?: string | number | Date | null;
  actionLabel?: string;
  redirectTo?: string;
}

function getBanDescription({
  message,
  reason,
  expiresAt,
}: Pick<BannedUserDialogProps, "message" | "reason" | "expiresAt">) {
  if (message) {
    return message;
  }

  const parts = ["Your account has been suspended."];

  if (reason) {
    parts.push(`Reason: ${reason}.`);
  }

  if (expiresAt) {
    const expiresOn = new Date(expiresAt);

    if (!Number.isNaN(expiresOn.getTime())) {
      parts.push(`This ban expires on ${expiresOn.toLocaleDateString()}.`);
    }
  }

  return parts.join(" ");
}

export function BannedUserDialog({
  message,
  reason,
  expiresAt,
  actionLabel = "Back to Login",
  redirectTo = "/login",
}: BannedUserDialogProps) {
  const router = useRouter();

  const handleContinue = async () => {
    await authClient.signOut();
    router.replace(redirectTo);
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account Suspended</AlertDialogTitle>
          <AlertDialogDescription>
            {getBanDescription({ message, reason, expiresAt })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleContinue}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
