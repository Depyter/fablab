import {
  ChatContentPane,
  ChatSidebarPane,
} from "@/components/chat/chat-layout-panels";
import {
  ChatSidebarLoading,
  ChatThreadLoading,
} from "@/components/chat/chat-loading";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 w-full">
      <ChatSidebarPane>
        <ChatSidebarLoading />
      </ChatSidebarPane>
      <ChatContentPane>
        <ChatThreadLoading />
      </ChatContentPane>
    </div>
  );
}
