import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard/chat")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
