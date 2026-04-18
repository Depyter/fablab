"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePageHeaderSlot } from "@/components/sidebar/page-header-context";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const pathname = usePathname();
  const pageHeaderContent = usePageHeaderSlot();

  const isInChatConversation = /^\/dashboard\/chat\/.+/.test(pathname);
  const isChat = pathname.startsWith("/dashboard/chat");

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-md border-b border-sidebar-border/50 sticky top-0 z-30 transition-all ease-in-out",
        isInChatConversation && "hidden md:flex",
      )}
    >
      <div className="flex items-center gap-2 px-4 w-full min-w-0">
        {!isChat && (
          <>
            <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-primary transition-colors shrink-0" />
            <Separator
              orientation="vertical"
              className="mx-2 h-4 bg-sidebar-border/60 shrink-0"
            />
          </>
        )}

        {/* Injected page title + actions */}
        {pageHeaderContent ? (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {pageHeaderContent}
          </div>
        ) : (
          <></>
        )}
      </div>
    </header>
  );
}
