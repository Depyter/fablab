import {
  ChatContentPane,
  ChatSidebarPane,
} from "@/components/chat/chat-layout-panels";
import { ChatRoomsProvider } from "@/components/chat/chat-rooms-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatRoomsProvider>
      <div className="flex h-full min-h-0 overflow-hidden">
        <ChatSidebarPane>
          <ChatSidebar className="h-full" />
        </ChatSidebarPane>
        <ChatContentPane>{children}</ChatContentPane>
      </div>
    </ChatRoomsProvider>
  );
}
