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
import { formatLabDate, formatLabTime } from "@/lib/lab-time";
import {
  WorkshopAttendeeRow,
  type AttendeeInfo,
} from "@/components/workshops/workshop-attendee-row";
import {
  BrandCard,
  SectionLabel,
  StatusBadge,
  type StatusColorSet,
  CapacityBar,
} from "@/components/brand/primitives";

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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  completed: "Completed",
  approved: "Approved",
  claimed: "Claimed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function LocalStatusBadge({
  status,
  count,
}: {
  status: string;
  count: number;
}) {
  const colors = STATUS_COLORS[status] ?? {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };

  return (
    <StatusBadge
      label={STATUS_LABELS[status] ?? status}
      colors={colors}
      count={count}
    />
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
    <BrandCard ref={cardRef} highlight={highlight}>
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
              <SectionLabel>Capacity</SectionLabel>
              <CapacityBar
                usedSlots={event.usedSlots}
                maxSlots={event.maxSlots}
              />
            </div>

            {/* Status breakdown */}
            {Object.keys(event.statusBreakdown).length > 0 && (
              <div className="space-y-1.5">
                <SectionLabel>Status Breakdown</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(event.statusBreakdown).map(
                    ([status, count]) =>
                      count > 0 && (
                        <LocalStatusBadge
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
              <SectionLabel>Attendees ({event.attendees.length})</SectionLabel>
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
    </BrandCard>
  );
}
