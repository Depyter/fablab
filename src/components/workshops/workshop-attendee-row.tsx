"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_LABELS,
  type ProjectStatusType,
} from "@convex/constants";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";

export type AttendeeInfo = {
  projectId: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  pfpUrl: string | null;
  createdAt: number;
  roomId: string | null;
  threadId: string | null;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    pending: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-400",
    },
    paid: {
      bg: "bg-teal-100 dark:bg-teal-900/30",
      text: "text-teal-700 dark:text-teal-300",
      dot: "bg-teal-400",
    },
    completed: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-400",
    },
    approved: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      dot: "bg-blue-400",
    },
    claimed: {
      bg: "bg-slate-100 dark:bg-slate-800/30",
      text: "text-slate-700 dark:text-slate-300",
      dot: "bg-slate-400",
    },
    rejected: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      dot: "bg-red-400",
    },
    cancelled: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      dot: "bg-red-400",
    },
  };

/** Valid workshop workflow transitions keyed by current status. */
const WORKSHOP_TRANSITIONS: Record<string, ProjectStatusType[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["paid", "completed", "cancelled"],
  paid: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
  claimed: [],
};

function AttendeeAvatar({
  name,
  pfpUrl,
}: {
  name: string;
  pfpUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (pfpUrl) {
    return (
      <img
        src={pfpUrl}
        alt={name}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
      {initials}
    </div>
  );
}

export function WorkshopAttendeeRow({
  attendee,
  readOnly = false,
  onOpenProjectDetails,
}: {
  attendee: AttendeeInfo;
  readOnly?: boolean;
  onOpenProjectDetails?: (projectId: string) => void;
}) {
  const colors = STATUS_COLORS[attendee.status] ?? STATUS_COLORS.pending;
  const updateProject = useMutation(api.projects.mutate.updateProject);
  const transitions = WORKSHOP_TRANSITIONS[attendee.status] ?? [];

  const handleStatusChange = async (newStatus: ProjectStatusType) => {
    try {
      await updateProject({
        projectId: attendee.projectId as Id<"projects">,
        status: newStatus,
      });
      toast.success(
        `${attendee.name} → ${PROJECT_STATUS_LABELS[newStatus] ?? newStatus}`,
      );
    } catch {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-amber-50/50">
      <AttendeeAvatar name={attendee.name} pfpUrl={attendee.pfpUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {attendee.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {attendee.email}
        </span>
      </div>

      {/* Status — dropdown if there are transitions available */}
      {transitions.length > 0 && !readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 gap-1 border-0 text-[10px] font-bold uppercase tracking-wider",
                colors.bg,
                colors.text,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
              {PROJECT_STATUS_LABELS[
                attendee.status as keyof typeof PROJECT_STATUS_LABELS
              ] ?? attendee.status}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {transitions.map((transition) => {
              const tColors =
                STATUS_COLORS[transition] ?? STATUS_COLORS.pending;
              return (
                <DropdownMenuItem
                  key={transition}
                  className="gap-2 text-xs"
                  onClick={() => handleStatusChange(transition)}
                >
                  <span className={cn("h-2 w-2 rounded-full", tColors.dot)} />
                  {PROJECT_STATUS_LABELS[transition] ?? transition}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold uppercase tracking-wider",
            colors.bg,
            colors.text,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
          {PROJECT_STATUS_LABELS[
            attendee.status as keyof typeof PROJECT_STATUS_LABELS
          ] ?? attendee.status}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {/* Chat — opens the conversation thread */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
          <Link
            href={`/dashboard/chat/${attendee.roomId}/${attendee.threadId}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
        </Button>

        {/* More — opens the workshop attendee details dialog */}
        {onOpenProjectDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onOpenProjectDetails(attendee.projectId)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            More
          </Button>
        )}
      </div>
    </div>
  );
}
