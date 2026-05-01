"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useChatThreadTitle } from "@/components/chat/chat-rooms-context";
import { useEffect } from "react";
import { ChatThreadLoading } from "@/components/chat/chat-loading";
import posthog from "posthog-js";

export function ChatThreadClient({
  roomId,
  threadId,
}: {
  roomId: Id<"rooms">;
  threadId: Id<"threads">;
}) {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const threadTitle = useChatThreadTitle(roomId, threadId);

  useEffect(() => {
    posthog.capture("chat_room_viewed", {
      room_id: roomId,
      thread_id: threadId,
    });
  }, [roomId, threadId]);

  if (currentUser === undefined) {
    return <ChatThreadLoading />;
  }

  return (
    <div className="flex h-full overflow-hidden min-h-0 relative">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex-1 min-h-0 bg-background">
          <ChatInterface
            roomId={roomId}
            threadId={threadId}
            threadTitle={threadTitle}
            currentUserName={currentUser?.name ?? ""}
            showBackButton={true}
          />
        </div>
      </div>
    </div>
  );
}
