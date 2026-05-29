import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard/chat")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_private/dashboard/chat/"!</div>;
}
