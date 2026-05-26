import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(private)/dashboard/chat/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(private)/dashboard/chat/"!</div>;
}
