import { Suspense } from "react";
import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ChatRoomClient } from "./_client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const roomId = slug as Id<"rooms">;

  const [preloadedRoom, preloadedCurrentUser] = await Promise.all([
    preloadAuthQuery(api.chat.query.getRoom, { roomId }),
    preloadAuthQuery(api.auth.getCurrentUser, {}),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading chat...
        </div>
      }
    >
      <ChatRoomClient
        roomId={roomId}
        preloadedRoom={preloadedRoom}
        preloadedCurrentUser={preloadedCurrentUser}
      />
    </Suspense>
  );
}
