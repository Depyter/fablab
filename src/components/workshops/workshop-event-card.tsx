"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Clock,
  XCircle,
} from "lucide-react";
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
  cancelledCount: number;
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
      <div className="flex h-3 flex-1 overflow-hidden border-2 border-black bg-white">
        <div
          className={cn(
            "h-full transition-all duration-500",
            isFull ? "bg-fab-amber" : "bg-fab-teal",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="shrink-0 text-sm font-black text-black">
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
        "inline-flex items-center gap-1.5 border-2 border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
        colors.bg,
        colors.text,
      )}
    >
      <span className={cn("h-2 w-2", colors.dot)} />
      {STATUS_LABELS[status] ?? status}
      <span className="ml-1">{count}</span>
    </span>
  );
}

export function WorkshopEventCard({
  event,
  highlight = false,
  readOnly = false,
  onOpenProjectDetails,
}: {
  event: WorkshopEvent;
  highlight?: boolean;
  readOnly?: boolean;
  onOpenProjectDetails?: (projectId: string) => void;
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
        "overflow-hidden border-4 border-black bg-white transition-all duration-200",
        "shadow-[6px_6px_0_0_#000]",
        highlight && "border-fab-amber shadow-[6px_6px_0_0_#d97706]",
      )}
    >
      {/* Header — clickable to expand/collapse */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-2xl font-black uppercase tracking-tighter text-black sm:text-3xl">
                {event.serviceName}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black/70">
                  <Calendar className="h-4 w-4 text-fab-amber" />
                  {formatLabDate(event.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black/70">
                  <Clock className="h-4 w-4 text-fab-teal" />
                  {formatLabTime(event.startTime)} –{" "}
                  {formatLabTime(event.endTime)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black/70">
                  <Users className="h-4 w-4 text-fab-magenta" />
                  {event.registrationCount}{" "}
                  {event.registrationCount === 1 ? "attendee" : "attendees"}
                </span>
                {event.cancelledCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600">
                    <XCircle className="h-4 w-4" />
                    {event.cancelledCount}{" "}
                    {event.cancelledCount === 1
                      ? "cancellation"
                      : "cancellations"}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-black/40 transition-transform duration-200">
              {isExpanded ? (
                <ChevronUp className="h-6 w-6" strokeWidth={3} />
              ) : (
                <ChevronDown className="h-6 w-6" strokeWidth={3} />
              )}
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="space-y-5 border-t-4 border-black px-5 py-5 sm:px-6 sm:py-6">
            {/* Capacity bar */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
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
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                  Status Breakdown
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(event.statusBreakdown).map(
                    ([status, count]) =>
                      count > 0 && (
                        <StatusBadge
                          key={status}
                          status={status}
                          count={count}
                        />
                      ),
                  )}
                </div>
              </div>
            )}

            {/* Attendee list */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Attendees ({event.attendees.length})
              </p>
              {event.attendees.length === 0 ? (
                <p className="border-2 border-dashed border-black/20 py-4 text-center text-sm font-bold text-black/40">
                  No attendees yet
                </p>
              ) : (
                <div className="divide-y-2 divide-black border-2 border-black">
                  {event.attendees.map((attendee) => (
                    <WorkshopAttendeeRow
                      key={attendee.projectId}
                      attendee={attendee as AttendeeInfo}
                      readOnly={readOnly}
                      onOpenProjectDetails={onOpenProjectDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
