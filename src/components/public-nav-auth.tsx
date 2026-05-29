import { getRouteApi, Link } from "@tanstack/react-router";
import { PublicNavItemContent } from "@/components/public-nav-item-content";

type PublicNavAuthProps = {
  dashboardClassName: string;
  loginClassName: string;
};

export function PublicNavAuth({
  dashboardClassName,
  loginClassName,
}: PublicNavAuthProps) {
  const publicApi = getRouteApi("/_public");
  const { isAuthenticated } = publicApi.useRouteContext();

  if (isAuthenticated === undefined || isAuthenticated === false) {
    return (
      <Link to={"/login"} className={`cursor-pointer ${loginClassName}`}>
        <PublicNavItemContent label={"Login"} />
      </Link>
    );
  }

  return (
    <aside>
      <Link
        to="/dashboard/chat"
        className={`cursor-pointer ${dashboardClassName}`}
      >
        <PublicNavItemContent label={"Dashboard"} />
      </Link>
    </aside>
  );
}
