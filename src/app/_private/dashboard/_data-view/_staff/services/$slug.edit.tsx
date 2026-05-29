import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_private/dashboard/_data-view/_staff/services/$slug/edit",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      Hello "/_private/dashboard/_data-view/_staff/services/$slug/edit"!
    </div>
  );
}
