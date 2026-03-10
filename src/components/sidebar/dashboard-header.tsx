"use client";

import { usePathname } from "next/navigation";
import { DashboardBreadcrumb } from "@/components/sidebar/dashboard-breadcrumb";
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
        "flex h-16 shrink-0 items-center gap-2 bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        isInChatConversation && "hidden md:flex",
      )}
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <DashboardBreadcrumb />
      </div>
    </header>
  );
}
