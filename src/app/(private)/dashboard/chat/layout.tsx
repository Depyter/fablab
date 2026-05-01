import { preloadAuthQuery } from "@/lib/auth-server";
import {
  ChatContentPane,
  ChatSidebarPane,
} from "@/components/chat/chat-layout-panels";
import { ChatRoomsProvider } from "@/components/chat/chat-rooms-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { api } from "@convex/_generated/api";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preloadedRooms = await preloadAuthQuery(api.chat.query.getRooms, {});

  return (
    <ChatRoomsProvider preloadedRooms={preloadedRooms}>
      <div className="flex h-full min-h-0">
        <ChatSidebarPane>
          <ChatSidebar className="h-full" />
        </ChatSidebarPane>
        <ChatContentPane>{children}</ChatContentPane>
      </div>
    </ChatRoomsProvider>
  );
}
