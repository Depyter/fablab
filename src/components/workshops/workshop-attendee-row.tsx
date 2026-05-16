"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABELS } from "@convex/constants";

export type AttendeeInfo = {
  projectId: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  pfpUrl: string | null;
  createdAt: number;
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
  roomId,
}: {
  attendee: AttendeeInfo;
  readOnly?: boolean;
  roomId?: string;
}) {
  const colors = STATUS_COLORS[attendee.status] ?? STATUS_COLORS.pending;

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
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 border-0 text-[10px] font-bold uppercase tracking-wider",
          colors.bg,
          colors.text,
        )}
      >
        <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", colors.dot)} />
        {PROJECT_STATUS_LABELS[attendee.status as keyof typeof PROJECT_STATUS_LABELS] ?? attendee.status}
      </Badge>
      <div className="flex shrink-0 items-center gap-1">
        {roomId ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            asChild
          >
            <Link href={`/dashboard/chat/${roomId}/${attendee.projectId}`}>
              <MessageCircle className="h-3.5 w-3.5" />
              Message
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Message
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={readOnly}
        >
          {attendee.status === "completed" || attendee.status === "paid"
            ? "✓ Attended"
            : "Check In"}
        </Button>
      </div>
    </div>
  );
}
