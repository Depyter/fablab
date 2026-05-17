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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_LABELS,
  type ProjectStatusType,
} from "@convex/constants";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import {
  StatusBadge,
  type StatusColorSet,
} from "@/components/brand/primitives";

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

const STATUS_COLORS: Record<string, StatusColorSet> = {
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  paid: {
    bg: "bg-fab-teal/20",
    text: "text-fab-teal",
    dot: "bg-fab-teal",
  },
  completed: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  approved: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  claimed: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
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

  const initials = attendee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-amber-50/50">
      <Avatar size="sm">
        {attendee.pfpUrl ? (
          <AvatarImage src={attendee.pfpUrl} alt={attendee.name} />
        ) : (
          <AvatarFallback className="bg-amber-100 text-amber-700 text-[10px] font-bold">
            {initials}
          </AvatarFallback>
        )}
      </Avatar>

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
            <button
              type="button"
              className={cn(
                "inline-flex h-7 items-center gap-1 border-2 border-black px-2.5 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]",
                colors.bg,
                colors.text,
              )}
            >
              <span className={cn("h-2 w-2", colors.dot)} />
              {PROJECT_STATUS_LABELS[
                attendee.status as keyof typeof PROJECT_STATUS_LABELS
              ] ?? attendee.status}
              <ChevronDown className="h-3 w-3" strokeWidth={3} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-36 border-2 border-black shadow-[4px_4px_0_0_#000]"
          >
            {transitions.map((transition) => {
              const tColors =
                STATUS_COLORS[transition] ?? STATUS_COLORS.pending;
              return (
                <DropdownMenuItem
                  key={transition}
                  className="gap-2 text-[10px] font-black uppercase tracking-wider"
                  onClick={() => handleStatusChange(transition)}
                >
                  <span className={cn("h-2 w-2", tColors.dot)} />
                  {PROJECT_STATUS_LABELS[transition] ?? transition}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <StatusBadge
          label={
            PROJECT_STATUS_LABELS[
              attendee.status as keyof typeof PROJECT_STATUS_LABELS
            ] ?? attendee.status
          }
          colors={colors}
        />
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
