import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard/_data-view/_staff")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
