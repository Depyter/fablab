"use client";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Preloaded } from "convex/react";

import { UsageTable } from "./usage-table";
import type { CalendarVisibleRange } from "./calendar-state";
import { CalendarRangeView } from "./calendar-range-view";
import {
  buildBookingCalendarViewModels,
  type CalendarBookingItem,
  type CalendarTab,
  type CalendarViewMode,
} from "@/lib/calendar";
import { getLabDayBounds } from "@/lib/lab-time";

export function BookingCalendarView({
  preloadedFrame,
  date,
  viewMode,
  visibleRange,
  onOpenProjectDetails,
  activeTab,
  bookings: bookingItems,
  bookingsLoading,
}: {
  preloadedFrame: Preloaded<typeof api.calendar.query.getCalendarFrame>;
  date: Date;
  viewMode: CalendarViewMode;
  visibleRange: CalendarVisibleRange;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
  activeTab: CalendarTab;
  bookings: CalendarBookingItem[];
  bookingsLoading: boolean;
}) {
  const frame = usePreloadedAuthQuery(preloadedFrame);
  const isAdminOrMaker = frame?.role === "admin" || frame?.role === "maker";
  const dayBounds = getLabDayBounds(date);
  const dayRange = {
    startTime: dayBounds.start.getTime(),
    endTime: dayBounds.endExclusive.getTime(),
  };
  const {
    resourceMachines,
    serviceMachines,
    resourceUsages,
    serviceUsages,
    rangeEvents,
  } = buildBookingCalendarViewModels({
    frame: frame ?? null,
    bookings: bookingItems,
    dayRange,
    activeTab,
    viewMode,
  });

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeTab === "services" ? (
          viewMode === "day" ? (
            <UsageTable
              machines={serviceMachines}
              usages={serviceUsages}
              onOpenProjectDetails={onOpenProjectDetails}
              leadingColumnLabel="SERVICES"
            />
          ) : (
            <CalendarRangeView
              anchorDate={date}
              days={visibleRange.days}
              events={rangeEvents}
              viewMode={viewMode}
              isLoading={bookingsLoading}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          )
        ) : isAdminOrMaker ? (
          viewMode === "day" ? (
            <UsageTable
              machines={resourceMachines}
              usages={resourceUsages}
              onOpenProjectDetails={onOpenProjectDetails}
              leadingColumnLabel="RESOURCES"
            />
          ) : (
            <CalendarRangeView
              anchorDate={date}
              days={visibleRange.days}
              events={rangeEvents}
              viewMode={viewMode}
              isLoading={bookingsLoading}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
