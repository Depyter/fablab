"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { usePathname, useSearchParams } from "next/navigation";
import { PublicNavItemContent } from "@/components/public-nav-item-content";
import { buildCurrentPath, buildLoginHref } from "@/lib/auth-redirect";

type PublicNavAuthProps = {
  dashboardClassName: string;
  loginClassName: string;
  loadingClassName: string;
  onNavigate?: () => void;
  compact?: boolean;
};

export function PublicNavAuth({
  dashboardClassName,
  loginClassName,
  loadingClassName,
  onNavigate,
  compact = false,
}: PublicNavAuthProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loginHref = buildLoginHref(buildCurrentPath(pathname, searchParams));

  const renderLabel = (label: string) =>
    compact ? (
      <span className="block text-center text-base font-black uppercase leading-none tracking-tighter">
        {label}
      </span>
    ) : (
      <PublicNavItemContent label={label} />
    );

  return (
    <>
      <AuthLoading>
        <div className={`${loadingClassName} animate-pulse`} />
      </AuthLoading>
      <Authenticated>
        <Link
          href="/dashboard/chat"
          className={`cursor-pointer ${dashboardClassName}`}
          onClick={onNavigate}
        >
          {renderLabel("Dashboard")}
        </Link>
      </Authenticated>
      <Unauthenticated>
        <Link
          href={loginHref}
          className={`cursor-pointer ${loginClassName}`}
          onClick={onNavigate}
        >
          {renderLabel("Login")}
        </Link>
      </Unauthenticated>
    </>
  );
}
