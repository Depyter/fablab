import { createFileRoute } from "@tanstack/react-router";
import { ServicesListClient } from "./_client";
export const Route = createFileRoute("/_public/services/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ServicesListClient />;
}
