import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard/_data-view")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
