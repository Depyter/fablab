"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { getSafeReturnTo } from "@/lib/auth-redirect";

export function LoginRedirect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeReturnTo(searchParams.get("redirectTo"));

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return null;
}
