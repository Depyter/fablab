"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ArrowLeftIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function ChatRoomClient({
  roomId,
  preloadedCurrentUser,
}: {
  roomId: Id<"rooms">;
  preloadedCurrentUser: Preloaded<typeof api.auth.getCurrentUser>;
}) {
  const currentUser = usePreloadedQuery(preloadedCurrentUser);
  const searchParams = useSearchParams();
  const activeThreadId = (searchParams.get("thread") ?? undefined) as
    | Id<"threads">
    | undefined;

  return (
    <div className="flex h-full overflow-hidden min-h-0 relative">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex-1 min-h-0 bg-background">
          {activeThreadId ? (
            <ChatInterface
              roomId={roomId}
              threadId={activeThreadId}
              currentUserName={currentUser?.name ?? ""}
              showBackButton={true}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground/60">
              <div className="rounded-full bg-muted p-4 mb-4">
                <ArrowLeftIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-foreground/80 mb-2">
                No thread selected
              </h3>
              <p className="text-sm max-w-sm">
                Select a thread from the sidebar to view messages or join the
                conversation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
