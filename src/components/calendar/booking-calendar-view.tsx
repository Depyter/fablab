"use client";
import type { Id } from "@convex/_generated/dataModel";

import { UsageTable } from "./usage-table";
import type { CalendarVisibleRange } from "./calendar-state";
import { CalendarRangeView } from "./calendar-range-view";
import {
  type CalendarMachine,
  type CalendarMachineUsage,
  type CalendarRangeEvent,
  type CalendarTab,
  type CalendarViewMode,
} from "@/lib/calendar";

export function BookingCalendarView({
  date,
  viewMode,
  visibleRange,
  onOpenProjectDetails,
  activeTab,
  isAdminOrMaker,
  bookingsLoading,
  serviceMachines,
  resourceMachines,
  serviceUsages,
  resourceUsages,
  rangeEvents,
}: {
  date: Date;
  viewMode: CalendarViewMode;
  visibleRange: CalendarVisibleRange;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
  activeTab: CalendarTab;
  isAdminOrMaker: boolean;
  bookingsLoading: boolean;
  serviceMachines: CalendarMachine[];
  resourceMachines: CalendarMachine[];
  serviceUsages: CalendarMachineUsage[];
  resourceUsages: CalendarMachineUsage[];
  rangeEvents: CalendarRangeEvent[];
}) {
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
