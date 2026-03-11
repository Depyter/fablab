"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export function ChatLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInConversation = pathname !== "/dashboard/chat";

  return (
    <div className="flex h-full min-h-0">
      {/* Chat list panel: full-width on mobile, fixed-width on desktop */}
      <div
        className={cn(
          "shrink-0 h-full border-r",
          "md:w-[350px] md:block",
          isInConversation ? "hidden" : "w-full",
        )}
      >
        <ChatSidebar className="h-full" />
      </div>

      {/* Chat content panel: hidden on mobile when showing list, flex-1 otherwise */}
      <div
        className={cn(
          "flex-1 h-full overflow-hidden min-w-0",
          !isInConversation
            ? "hidden md:flex md:items-center md:justify-center"
            : "flex flex-col",
        )}
      >
        {children}
      </div>
    </div>
  );
}
