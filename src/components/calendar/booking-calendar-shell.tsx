"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { startOfToday } from "date-fns";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import type { Preloaded } from "convex/react";
import { useQuery } from "convex/react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getLabDayBounds } from "@/lib/lab-time";
import type {
  CalendarBookingItem,
  CalendarTab,
  CalendarViewMode,
} from "@/lib/calendar";
import { ProjectDetails } from "@/components/projects/project-details";
import { CalendarContentLoadingState } from "./calendar-loading";
import { getVisibleRange, shiftDate } from "./calendar-state";

const BookingCalendarClient = dynamic(
  () =>
    import("./booking-calendar-view").then(
      (module) => module.BookingCalendarView,
    ),
  {
    loading: () => <CalendarContentLoadingState viewMode="day" />,
  },
);

export function BookingCalendarShell({
  preloadedFrame,
}: {
  preloadedFrame: Preloaded<typeof api.calendar.query.getCalendarFrame>;
}) {
  const [date, setDate] = React.useState<Date>(() => startOfToday());
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("day");
  const [activeTab, setActiveTab] = React.useState<CalendarTab>("services");
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<Id<"projects"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const frame = usePreloadedAuthQuery(preloadedFrame);
  const isAdminOrMaker = frame?.role === "admin" || frame?.role === "maker";

  const visibleRange = React.useMemo(
    () => getVisibleRange(date, viewMode),
    [date, viewMode],
  );
  const queryRange = React.useMemo(() => {
    const firstDay = visibleRange.days[0];
    const lastDay = visibleRange.days[visibleRange.days.length - 1];

    const { start } = getLabDayBounds(firstDay);
    const { endExclusive } = getLabDayBounds(lastDay);

    return {
      startTime: start.getTime(),
      endTime: endExclusive.getTime(),
    };
  }, [visibleRange.days]);

  const bookings = useQuery(api.calendar.query.getCalendarBookings, {
    startTime: queryRange.startTime,
    endTime: queryRange.endTime,
  });
  const bookingsLoading = bookings === undefined;
  const bookingItems = React.useMemo<CalendarBookingItem[]>(
    () => bookings ?? [],
    [bookings],
  );

  const handlePrevPeriod = React.useCallback(() => {
    setDate((prev) => shiftDate(prev, viewMode, -1));
  }, [viewMode]);

  const handleNextPeriod = React.useCallback(() => {
    setDate((prev) => shiftDate(prev, viewMode, 1));
  }, [viewMode]);

  const handleReset = React.useCallback(() => {
    setDate(startOfToday());
  }, []);

  const handleOpenProjectDetails = React.useCallback(
    (projectId: Id<"projects">) => {
      setSelectedProjectId(projectId);
      setIsDetailsOpen(true);
    },
    [],
  );

  const handleDetailsOpenChange = React.useCallback((open: boolean) => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedProjectId(null);
    }
  }, []);

  const totalProjects = React.useMemo(
    () =>
      new Set(
        bookingItems.flatMap((booking) =>
          booking.projectId ? [booking.projectId] : [],
        ),
      ).size,
    [bookingItems],
  );
  const staffTabs = [
    { id: "services", label: "Services", icon: LayoutGrid },
    { id: "resources", label: "Machines", icon: Users },
  ] as const;

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-2">
          <div className="inline-flex max-w-full items-center rounded-md border bg-background p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevPeriod}
              className="h-7 w-7 rounded-sm"
              aria-label={visibleRange.previousLabel}
              title={visibleRange.previousLabel}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextPeriod}
              className="h-7 w-7 rounded-sm"
              aria-label={visibleRange.nextLabel}
              title={visibleRange.nextLabel}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border/60" />

            <Button
              variant="ghost"
              className="h-7 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              Today
            </Button>

            <div className="mx-1 h-4 w-px bg-border/60" />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 max-w-full gap-2 rounded-sm px-3 text-xs font-medium"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{visibleRange.label}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(nextDate) => nextDate && setDate(nextDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="inline-flex max-w-full items-center rounded-md border bg-background p-0.5">
            {(
              [
                ["day", "Day"],
                ["week", "Week"],
                ["month", "Month"],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                variant="ghost"
                className={cn(
                  "h-7 rounded-sm px-3 text-xs font-medium transition-colors",
                  viewMode === mode
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => setViewMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>

          {isAdminOrMaker && (
            <div className="inline-flex max-w-full items-center rounded-md border bg-background p-0.5">
              {staffTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  className={cn(
                    "h-7 gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              ))}
            </div>
          )}

          <div className="hidden flex-1 lg:block" />

          {!bookingsLoading && (
            <div className="hidden items-center gap-3 px-2 text-xs font-medium text-muted-foreground lg:flex">
              <div className="flex items-center gap-1.5">
                <span className="text-foreground">{bookingItems.length}</span>
                <span>
                  {bookingItems.length === 1 ? "booking" : "bookings"}
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-foreground">{totalProjects}</span>
                <span>{totalProjects === 1 ? "project" : "projects"}</span>
              </div>
            </div>
          )}
        </div>

        <React.Suspense
          fallback={<CalendarContentLoadingState viewMode={viewMode} />}
        >
          <BookingCalendarClient
            preloadedFrame={preloadedFrame}
            date={date}
            viewMode={viewMode}
            visibleRange={visibleRange}
            onOpenProjectDetails={handleOpenProjectDetails}
            activeTab={activeTab}
            bookings={bookingItems}
            bookingsLoading={bookingsLoading}
          />
        </React.Suspense>
      </div>

      <ProjectDetails
        projectId={selectedProjectId}
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        hideTrigger
      />
    </>
  );
}
