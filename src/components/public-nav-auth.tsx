import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { PublicNavItemContent } from "@/components/public-nav-item-content";

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
          to="/dashboard/chat"
          className={`cursor-pointer ${dashboardClassName}`}
          onClick={onNavigate}
        >
          {renderLabel("Dashboard")}
        </Link>
      </Authenticated>
      <Unauthenticated>
        {/* login redirection can be better handled in tanstack start*/}
        <Link
          to={"/"}
          className={`cursor-pointer ${loginClassName}`}
          onClick={onNavigate}
        >
          {renderLabel("Login")}
        </Link>
      </Unauthenticated>
    </>
  );
}
