import { ChatSidebarContent } from "./chat-sidebar-content";
import { ChatSidebarRoomsLoading } from "./chat-loading";
import { ChatSidebarShell } from "./chat-sidebar-shell";

export function ChatSidebar({ className }: { className?: string }) {
  return (
    <ChatSidebarShell className={className}>
      <ChatSidebarContent />
    </ChatSidebarShell>
  );
}

export function ChatSidebarLoading({ className }: { className?: string }) {
  return (
    <ChatSidebarShell className={className}>
      <ChatSidebarRoomsLoading />
    </ChatSidebarShell>
  );
}
