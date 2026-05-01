"use client";

import {
  ChatContentPane,
  ChatSidebarPane,
} from "@/components/chat/chat-layout-panels";
import { useHasChatShell } from "@/components/chat/chat-shell-context";
import { ChatSidebarLoading, ChatThreadLoading } from "@/components/chat/chat-loading";

export function ChatRouteLoading() {
  const hasChatShell = useHasChatShell();

  if (hasChatShell) {
    return <ChatThreadLoading />;
  }

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
