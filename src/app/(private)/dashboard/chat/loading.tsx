import {
  ChatContentPane,
  ChatSidebarPane,
} from "@/components/chat/chat-layout-panels";
import { ChatSelectThreadState } from "@/components/chat/chat-select-thread-state";
import { ChatSidebarLoading } from "@/components/chat/chat-sidebar";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 w-full">
      <ChatSidebarPane>
        <ChatSidebarLoading />
      </ChatSidebarPane>
      <ChatContentPane>
        <ChatSelectThreadState />
      </ChatContentPane>
    </div>
  );
}
