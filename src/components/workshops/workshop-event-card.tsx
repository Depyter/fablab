"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Users, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLabDate, formatLabTime } from "@/lib/lab-time";
import {
  WorkshopAttendeeRow,
  type AttendeeInfo,
} from "@/components/workshops/workshop-attendee-row";

export type WorkshopEvent = {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  date: number;
  startTime: number;
  endTime: number;
  maxSlots: number;
  usedSlots: number;
  registrationCount: number;
  statusBreakdown: Record<string, number>;
  attendees: Array<{
    projectId: string;
    userId: string;
    name: string;
    email: string;
    status: string;
    pfpUrl: string | null;
    createdAt: number;
  }>;
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  completed: "Completed",
  approved: "Approved",
  claimed: "Claimed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function CapacityBar({
  usedSlots,
  maxSlots,
}: {
  usedSlots: number;
  maxSlots: number;
}) {
  const percentage =
    maxSlots > 0 ? Math.min((usedSlots / maxSlots) * 100, 100) : 0;
  const isFull = usedSlots >= maxSlots;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-amber-100/60">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isFull ? "bg-amber-500" : "bg-amber-400",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold text-amber-700">
        {usedSlots}/{maxSlots}
      </span>
    </div>
  );
}

function StatusBadge({ status, count }: { status: string; count: number }) {
  const colors = STATUS_COLORS[status] ?? {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        colors.bg,
        colors.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {STATUS_LABELS[status] ?? status}
      <span className="ml-0.5 opacity-70">{count}</span>
    </span>
  );
}

export function WorkshopEventCard({
  event,
  highlight = false,
  readOnly = false,
}: {
  event: WorkshopEvent;
  highlight?: boolean;
  readOnly?: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(highlight);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "overflow-hidden rounded-xl border transition-shadow",
        highlight
          ? "border-amber-400 shadow-lg shadow-amber-200/50 ring-2 ring-amber-400/30"
          : "border-amber-200/60 shadow-sm hover:shadow-md",
      )}
    >
      {/* Header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-amber-50 to-amber-50/60 px-4 py-3 text-left transition-colors hover:from-amber-100/80 hover:to-amber-50/80"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-sm font-bold text-amber-900">
            {event.serviceName}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-amber-700/80">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatLabDate(event.date, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatLabTime(event.startTime)} – {formatLabTime(event.endTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {event.registrationCount}{" "}
              {event.registrationCount === 1 ? "attendee" : "attendees"}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-amber-500 transition-transform duration-200">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4 border-t border-amber-200/50 px-4 py-3">
          {/* Capacity bar */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/70">
              Capacity
            </p>
            <CapacityBar
              usedSlots={event.usedSlots}
              maxSlots={event.maxSlots}
            />
          </div>

          {/* Status breakdown */}
          {Object.keys(event.statusBreakdown).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/70">
                Status Breakdown
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(event.statusBreakdown).map(
                  ([status, count]) =>
                    count > 0 && (
                      <StatusBadge key={status} status={status} count={count} />
                    ),
                )}
              </div>
            </div>
          )}

          {/* Attendee list */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/70">
              Attendees ({event.attendees.length})
            </p>
            {event.attendees.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No attendees yet
              </p>
            ) : (
              <div className="divide-y divide-amber-100 rounded-lg border border-amber-200/60">
                {event.attendees.map((attendee) => (
                  <WorkshopAttendeeRow
                    key={attendee.projectId}
                    attendee={attendee as AttendeeInfo}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
