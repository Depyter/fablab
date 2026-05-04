"use client";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
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
import { Skeleton } from "@/components/ui/skeleton";
import { LAB_TIME_ZONE } from "@/lib/lab-time";
import { cn } from "@/lib/utils";
import type { CalendarTab, CalendarViewMode } from "@/lib/calendar";
import type { CalendarVisibleRange } from "./calendar-state";

export const BOOKING_CALENDAR_VIEW_MODE_OPTIONS = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
] as const satisfies ReadonlyArray<readonly [CalendarViewMode, string]>;

export const BOOKING_CALENDAR_STAFF_TABS = [
  { id: "services", label: "Services", icon: LayoutGrid },
  { id: "resources", label: "Machines", icon: Users },
] as const satisfies ReadonlyArray<{
  id: CalendarTab;
  label: string;
  icon: typeof LayoutGrid;
}>;

export function BookingCalendarToolbar({
  date,
  viewMode,
  activeTab,
  visibleRange,
  isAdminOrMaker,
  bookingsLoading,
  totalBookings,
  totalProjects,
  onSelectDate,
  onPrevPeriod,
  onNextPeriod,
  onReset,
  onViewModeChange,
  onTabChange,
}: {
  date: Date;
  viewMode: CalendarViewMode;
  activeTab: CalendarTab;
  visibleRange: CalendarVisibleRange;
  isAdminOrMaker: boolean;
  bookingsLoading: boolean;
  totalBookings: number;
  totalProjects: number;
  onSelectDate: (date: Date | undefined) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onReset: () => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onTabChange: (tab: CalendarTab) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-2">
      <div className="inline-flex max-w-full items-center rounded-md border bg-background p-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevPeriod}
          className="h-7 w-7 rounded-sm"
          aria-label={visibleRange.previousLabel}
          title={visibleRange.previousLabel}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextPeriod}
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
          onClick={onReset}
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
              timeZone={LAB_TIME_ZONE}
              selected={date}
              onSelect={onSelectDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="inline-flex max-w-full items-center rounded-md border bg-background p-0.5">
        {BOOKING_CALENDAR_VIEW_MODE_OPTIONS.map(([mode, label]) => (
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
            onClick={() => onViewModeChange(mode)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isAdminOrMaker ? (
        <div className="inline-flex max-w-full items-center rounded-md border bg-background p-0.5">
          {BOOKING_CALENDAR_STAFF_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                "h-7 gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="hidden flex-1 lg:block" />

      {!bookingsLoading ? (
        <div className="hidden items-center gap-3 px-2 text-xs font-medium text-muted-foreground lg:flex">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground">{totalBookings}</span>
            <span>{totalBookings === 1 ? "booking" : "bookings"}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-foreground">{totalProjects}</span>
            <span>{totalProjects === 1 ? "project" : "projects"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BookingCalendarToolbarSkeleton({
  viewMode = "day",
  activeTab = "services",
  showStaffTabs = true,
}: {
  viewMode?: CalendarViewMode;
  activeTab?: CalendarTab;
  showStaffTabs?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-muted/20 px-4 py-2 flex-wrap">
      <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
        <Skeleton className="h-7 w-7 rounded-sm" />
        <Skeleton className="h-7 w-7 rounded-sm" />
        <div className="h-4 w-px bg-border/60" />
        <Skeleton className="h-7 w-14 rounded-sm" />
        <div className="h-4 w-px bg-border/60" />
        <Skeleton className="h-7 w-32 rounded-sm" />
      </div>

      <div className="inline-flex items-center rounded-md border bg-background p-0.5">
        {BOOKING_CALENDAR_VIEW_MODE_OPTIONS.map(([mode, label]) => (
          <div
            key={mode}
            className={cn(
              "flex h-7 items-center rounded-sm px-3 text-xs font-medium",
              viewMode === mode
                ? "bg-muted text-foreground"
                : "text-muted-foreground",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {showStaffTabs ? (
        <div className="inline-flex items-center rounded-md border bg-background p-0.5">
          {BOOKING_CALENDAR_STAFF_TABS.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium",
                activeTab === tab.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </div>
          ))}
        </div>
      ) : null}

      <div className="hidden flex-1 lg:block" />

      <div className="hidden items-center gap-3 px-2 lg:flex">
        <Skeleton className="h-4 w-16" />
        <div className="h-3 w-px bg-border" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
