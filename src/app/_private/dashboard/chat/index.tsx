import { createFileRoute } from "@tanstack/react-router";
import { ChatSelectThreadState } from "@/components/chat/chat-select-thread-state";

export const Route = createFileRoute("/_private/dashboard/chat/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ChatSelectThreadState />;
}
