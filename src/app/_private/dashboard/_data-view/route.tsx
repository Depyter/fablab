import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DataViewShell } from "@/components/manage/data-view-shell";

export const Route = createFileRoute("/_private/dashboard/_data-view")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DataViewShell>
      <Outlet />
    </DataViewShell>
  );
}
