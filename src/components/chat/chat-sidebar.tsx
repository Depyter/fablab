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

export function ChatSidebar({ className }: { className?: string }) {
  const profile = useProfile();
  const assignedProjectIds = useQuery(api.projects.query.getAssignedProjectIds);
  const [assignedOnly, setAssignedOnly] = React.useState(false);

  const isMaker = profile?.role === UserRole.MAKER;
  const showToggle = isMaker && assignedProjectIds !== undefined;

  const headerEnd = showToggle ? (
    <Button
      variant={assignedOnly ? "default" : "outline"}
      size="sm"
      className="h-7 shrink-0 gap-1 px-2 text-xs"
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
