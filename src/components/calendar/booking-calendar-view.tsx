import type { Id } from "@convex/_generated/dataModel";
import type {
  CalendarMachine,
  CalendarMachineUsage,
  CalendarRangeEvent,
  CalendarTab,
  CalendarViewMode,
} from "@/lib/calendar";
import { CalendarRangeView } from "./calendar-range-view";

import type { CalendarVisibleRange } from "./calendar-state";
import { UsageTable } from "./usage-table";

export function BookingCalendarView({
  date,
  viewMode,
  visibleRange,
  onSelectDay,
  onOpenProjectDetails,
  onOpenWorkshopEvent,
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
  onSelectDay?: (date: Date) => void;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
  onOpenWorkshopEvent?: (serviceId: string, startTime: number) => void;
  activeTab: CalendarTab;
  isAdminOrMaker: boolean;
  bookingsLoading: boolean;
  serviceMachines: Array<CalendarMachine>;
  resourceMachines: Array<CalendarMachine>;
  serviceUsages: Array<CalendarMachineUsage>;
  resourceUsages: Array<CalendarMachineUsage>;
  rangeEvents: Array<CalendarRangeEvent>;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeTab === "services" ? (
          viewMode === "day" ? (
            <UsageTable
              machines={serviceMachines}
              usages={serviceUsages}
              onOpenProjectDetails={onOpenProjectDetails}
              onOpenWorkshopEvent={onOpenWorkshopEvent}
              leadingColumnLabel="SERVICES"
            />
          ) : (
            <CalendarRangeView
              anchorDate={date}
              days={visibleRange.days}
              events={rangeEvents}
              viewMode={viewMode}
              isLoading={bookingsLoading}
              onSelectDay={onSelectDay}
              onOpenProjectDetails={onOpenProjectDetails}
              onOpenWorkshopEvent={onOpenWorkshopEvent}
            />
          )
        ) : isAdminOrMaker ? (
          viewMode === "day" ? (
            <UsageTable
              machines={resourceMachines}
              usages={resourceUsages}
              onOpenProjectDetails={onOpenProjectDetails}
              onOpenWorkshopEvent={onOpenWorkshopEvent}
              leadingColumnLabel="RESOURCES"
            />
          ) : (
            <CalendarRangeView
              anchorDate={date}
              days={visibleRange.days}
              events={rangeEvents}
              viewMode={viewMode}
              isLoading={bookingsLoading}
              onSelectDay={onSelectDay}
              onOpenProjectDetails={onOpenProjectDetails}
              onOpenWorkshopEvent={onOpenWorkshopEvent}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
