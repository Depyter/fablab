"use client";

import * as React from "react";
import { UserCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { UserRole } from "@convex/constants";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/sidebar/profile-context";
import { ChatSidebarContent } from "./chat-sidebar-content";
import { ChatSidebarRoomsLoading } from "./chat-loading";
import { ChatSidebarShell } from "./chat-sidebar-shell";
import { cn } from "@/lib/utils";

export function ChatSidebar({ className }: { className?: string }) {
  const profile = useProfile();
  const assignedProjectIds = useQuery(api.projects.query.getAssignedProjectIds);
  const [assignedOnly, setAssignedOnly] = React.useState(false);

  const isMaker = profile?.role === UserRole.MAKER;
  const showToggle = isMaker && assignedProjectIds !== undefined;

  const headerEnd = showToggle ? (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-7 shrink-0 gap-1 px-2 text-[10px] font-black uppercase tracking-[0.16em] rounded-none border-2 border-black shadow-[2px_2px_0_0_#000] transition-transform",
        assignedOnly
          ? "bg-[var(--fab-amber)] text-[var(--fab-text-primary)] hover:bg-[var(--fab-amber)]"
          : "bg-white text-[var(--fab-text-primary)] hover:bg-[var(--fab-bg-main)]",
        "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
      )}
      onClick={() => setAssignedOnly((prev) => !prev)}
    >
      <UserCheck className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">
        {assignedOnly ? "Assigned" : "All Chats"}
      </span>
    </Button>
  ) : undefined;

  return (
    <ChatSidebarShell className={className} headerEnd={headerEnd}>
      <ChatSidebarContent
        assignedOnly={assignedOnly}
        assignedProjectIds={assignedProjectIds}
      />
    </ChatSidebarShell>
  );
}

export function ChatSidebarLoading({ className }: { className?: string }) {
  return (
    <ChatSidebarShell className={className}>
      <ChatSidebarRoomsLoading />
    </ChatSidebarShell>
  );
}
