"use client";

import { usePathname } from "next/navigation";
import { DashboardBreadcrumb } from "@/components/sidebar/dashboard-breadcrumb";
import { ChatPresenceWidget } from "@/components/chat/presence-indicator";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const pathname = usePathname();

  // Hide on mobile when inside a specific chat conversation (back button header takes over)
  const isInChatConversation = /^\/dashboard\/chat\/.+/.test(pathname);

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-md border-b border-sidebar-border/50 sticky top-0 z-30 transition-all ease-in-out",
        isInChatConversation && "hidden md:flex",
      )}
    >
      <div className="flex items-center gap-2 px-4 w-full">
        <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-primary transition-colors" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 bg-sidebar-border/60"
        />
        <div className="flex-1 overflow-hidden">
          <DashboardBreadcrumb />
        </div>
        <ChatPresenceWidget />
      </div>
    </header>
  );
}
