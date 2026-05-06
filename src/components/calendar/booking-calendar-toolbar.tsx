"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Users,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
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

function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState(() =>
    typeof window !== "undefined"
      ? window.innerWidth >= 768 && window.innerWidth < 1024
      : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const onChange = () =>
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}

export function CalendarNavigation({
  date,
  visibleRange,
  onSelectDate,
  onPrevPeriod,
  onNextPeriod,
  onReset,
  className,
}: {
  date: Date;
  visibleRange: CalendarVisibleRange;
  onSelectDate: (date: Date | undefined) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
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

      <Button
        variant="ghost"
        className="hidden h-7 rounded-sm px-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground sm:flex sm:text-xs"
        onClick={onReset}
      >
        Today
      </Button>

      <div className="mx-1 h-4 w-px bg-border/60 hidden sm:block" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-7 max-w-full gap-2 rounded-sm px-2.5 text-[10px] font-medium sm:text-xs"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate hidden sm:inline">
              {visibleRange.label}
            </span>
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
  );
}

export function CalendarViewSwitcher({
  viewMode,
  onViewModeChange,
  className,
}: {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const currentLabel =
    BOOKING_CALENDAR_VIEW_MODE_OPTIONS.find(
      ([mode]) => mode === viewMode,
    )?.[1] ?? "Day";

  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-7 gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium",
              className,
            )}
          >
            {currentLabel}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-28">
          {BOOKING_CALENDAR_VIEW_MODE_OPTIONS.map(([mode, label]) => (
            <DropdownMenuItem
              key={mode}
              onSelect={() => onViewModeChange(mode)}
              className={cn(
                "justify-between",
                viewMode === mode && "bg-muted text-foreground",
              )}
            >
              {label}
              {viewMode === mode ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isTablet) {
    return (
      <Select
        value={viewMode}
        onValueChange={(value) => onViewModeChange(value as CalendarViewMode)}
      >
        <SelectTrigger
          className={cn(
            "h-7 min-w-24 rounded-md border bg-background px-2.5 text-xs shadow-none",
            className,
          )}
        >
          <SelectValue placeholder="View">{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {BOOKING_CALENDAR_VIEW_MODE_OPTIONS.map(([mode, label]) => (
            <SelectItem key={mode} value={mode}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-background p-0.5",
        className,
      )}
    >
      {BOOKING_CALENDAR_VIEW_MODE_OPTIONS.map(([mode, label]) => (
        <Button
          key={mode}
          type="button"
          variant="ghost"
          className={cn(
            "h-7 rounded-sm px-2.5 text-[10px] sm:text-xs font-medium transition-colors",
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
  );
}

export function CalendarTabSwitcher({
  activeTab,
  onTabChange,
  className,
}: {
  activeTab: CalendarTab;
  onTabChange: (tab: CalendarTab) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-background p-0.5",
        className,
      )}
    >
      {BOOKING_CALENDAR_STAFF_TABS.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          className={cn(
            "h-7 gap-1.5 rounded-sm px-2.5 text-[10px] sm:text-xs font-medium transition-colors",
            activeTab === tab.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          onClick={() => onTabChange(tab.id)}
        >
          <tab.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{tab.label}</span>
        </Button>
      ))}
    </div>
  );
}
