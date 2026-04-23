"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ArrowLeftIcon, HashIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

export function ChatRoomClient({
  roomId,
  preloadedCurrentUser,
}: {
  roomId: Id<"rooms">;
  preloadedCurrentUser: Preloaded<typeof api.auth.getCurrentUser>;
}) {
  const currentUser = usePreloadedAuthQuery(preloadedCurrentUser);
  const searchParams = useSearchParams();
  const activeThreadId = (searchParams.get("thread") ?? undefined) as
    | Id<"threads">
    | undefined;

  useEffect(() => {
    posthog.capture("chat_room_viewed", {
      room_id: roomId,
      thread_id: activeThreadId,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
            <div
              className="relative flex h-full flex-col items-center justify-center overflow-hidden p-8 text-center"
              style={{ background: "var(--fab-bg-main)" }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(var(--fab-grid) 1px, transparent 1px),
                    linear-gradient(90deg, var(--fab-grid) 1px, transparent 1px)
                  `,
                  backgroundSize: "28px 28px",
                }}
              />
              <div
                className="relative flex max-w-md flex-col items-center rounded-[28px] px-8 py-10"
                style={{
                  background: "var(--fab-chat-empty-card)",
                  border: "1px solid var(--fab-border-md)",
                  boxShadow: `0 20px 60px var(--fab-chat-empty-glow)`,
                }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex size-12 items-center justify-center rounded-2xl"
                    style={{ background: "var(--fab-amber-light)" }}
                  >
                    <HashIcon
                      className="h-5 w-5"
                      style={{ color: "var(--fab-amber)" }}
                    />
                  </div>
                  <div
                    className="flex size-12 items-center justify-center rounded-2xl"
                    style={{ background: "var(--fab-magenta-light)" }}
                  >
                    <ArrowLeftIcon
                      className="h-5 w-5"
                      style={{ color: "var(--fab-magenta)" }}
                    />
                  </div>
                </div>
                <span
                  className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{
                    color: "var(--fab-amber)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Select a conversation
                </span>
                <h3
                  className="font-mono mb-3 text-2xl font-semibold"
                  style={{
                    color: "var(--fab-text-primary)",
                  }}
                >
                  No thread selected
                </h3>
                <p
                  className="max-w-sm text-sm leading-6"
                  style={{
                    color: "var(--fab-text-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Pick a thread from the sidebar to read updates, reply to your
                  team, or jump back into the conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
