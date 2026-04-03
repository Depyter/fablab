"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export function ChatRoomClient({
  roomId,
  preloadedRoom,
  preloadedCurrentUser,
}: {
  roomId: Id<"rooms">;
  preloadedRoom: Preloaded<typeof api.chat.query.getRoom>;
  preloadedCurrentUser: Preloaded<typeof api.auth.getCurrentUser>;
}) {
  const room = usePreloadedQuery(preloadedRoom);
  const currentUser = usePreloadedQuery(preloadedCurrentUser);
  const searchParams = useSearchParams();
  const activeThreadId = (searchParams.get("thread") ?? undefined) as
    | Id<"threads">
    | undefined;

  return (
    <div className="flex h-full overflow-hidden min-h-0 relative">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Mobile-only header with back button and room name */}
        <div className="md:hidden flex items-center justify-between px-2 py-2 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/chat">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              {room?.color && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: room.color }}
                />
              )}
              <span className="font-medium truncate">{room?.name ?? ""}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ChatInterface
            roomId={roomId}
            threadId={activeThreadId}
            currentUserName={currentUser?.name ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
