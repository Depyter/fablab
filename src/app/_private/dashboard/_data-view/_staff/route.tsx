import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard/_data-view/_staff")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const role = context.role;

    if (role !== "admin" && role !== "maker") {
      throw redirect({
        to: "/dashboard/chat",
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
