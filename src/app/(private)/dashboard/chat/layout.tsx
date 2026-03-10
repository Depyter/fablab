import { ChatLayoutClient } from "@/components/chat/chat-layout-client";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatLayoutClient>{children}</ChatLayoutClient>;
}
