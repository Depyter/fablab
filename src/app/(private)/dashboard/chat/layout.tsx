import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { ChatLayoutClient } from "@/components/chat/chat-layout-client";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preloadedRooms = await preloadAuthQuery(api.chat.query.getRooms, {});

  return (
    <ChatLayoutClient preloadedRooms={preloadedRooms}>
      {children}
    </ChatLayoutClient>
  );
}
