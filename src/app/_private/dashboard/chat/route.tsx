import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import {
  ChatContentPane,
  ChatSidebarPane,
} from "@/components/chat/chat-layout-panels";
import { ChatRoomsProvider } from "@/components/chat/chat-rooms-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export const Route = createFileRoute("/_private/dashboard/chat")({
  component: RouteComponent,
  loader: (opts) => {
    opts.context.queryClient.fetchQuery(convexQuery(api.chat.query.getRooms));
  },
});

function RouteComponent() {
  "use no memo";

  const { data: rooms, isPending } = useQuery(
    convexQuery(api.chat.query.getRooms),
  );

  const matchRoute = useMatchRoute();
  const threadMatch = matchRoute({
    to: "/dashboard/chat/$roomId/$threadId",
  });
  const isInConversation = !!threadMatch;

  return (
    <ChatRoomsProvider rooms={rooms} isPending={isPending}>
      <div className="flex h-full min-h-0 overflow-hidden">
        <ChatSidebarPane isInConversation={isInConversation}>
          <ChatSidebar className="h-full" />
        </ChatSidebarPane>
        <ChatContentPane isInConversation={isInConversation}>
          <Outlet />
        </ChatContentPane>
      </div>
    </ChatRoomsProvider>
  );
}
