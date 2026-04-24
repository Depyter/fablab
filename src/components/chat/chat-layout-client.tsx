"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export function ChatLayoutClient({
  children,
  preloadedRooms,
}: {
  children: React.ReactNode;
  preloadedRooms: Preloaded<typeof api.chat.query.getRooms>;
}) {
  const pathname = usePathname();
  const isInConversation = pathname !== "/dashboard/chat";

  return (
    <div className="flex h-full min-h-0">
      {/* Chat list panel: full-width on mobile, fixed-width on desktop */}
      <div
        className={cn(
          "shrink-0 h-full",
          "md:w-[300px] md:block",
          isInConversation ? "hidden" : "w-full",
        )}
        style={{ borderRight: "1px solid var(--fab-border-md)" }}
      >
        <Suspense
          fallback={
            <div
              className="h-full flex items-center justify-center text-sm uppercase tracking-widest font-bold"
              style={{
                background: "var(--fab-bg-sidebar)",
                color: "var(--fab-text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              Loading...
            </div>
          }
        >
          <ChatSidebar preloadedRooms={preloadedRooms} className="h-full" />
        </Suspense>
      </div>

      {/* Chat content panel: hidden on mobile when showing list, flex-1 otherwise */}
      <div
        className={cn(
          "flex-1 h-full overflow-hidden min-w-0",
          !isInConversation
            ? "hidden md:flex md:items-center md:justify-center"
            : "flex flex-col",
        )}
        style={{ background: "var(--fab-bg-main)" }}
      >
        {children}
      </div>
    </div>
  );
}
