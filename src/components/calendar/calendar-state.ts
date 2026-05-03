import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import type { CalendarViewMode } from "@/lib/calendar";

export const WEEK_STARTS_ON = 1 as const;

export interface CalendarVisibleRange {
  start: Date;
  endExclusive: Date;
  days: Date[];
  label: string;
  scopeLabel: string;
  controlEyebrow: string;
  resetLabel: string;
  previousLabel: string;
  nextLabel: string;
}

export function getVisibleRange(
  date: Date,
  viewMode: CalendarViewMode,
): CalendarVisibleRange {
  if (viewMode === "day") {
    const start = startOfDay(date);

    return {
      start,
      endExclusive: addDays(start, 1),
      days: [start],
      label: format(start, "EEE, MMM dd"),
      scopeLabel: "today",
      controlEyebrow: "Selected day",
      resetLabel: "Today",
      previousLabel: "Previous day",
      nextLabel: "Next day",
    };
  }

  if (viewMode === "week") {
    const start = startOfDay(date);
    const end = addDays(start, 6);

    return {
      start,
      endExclusive: addDays(end, 1),
      days: eachDayOfInterval({ start, end }),
      label: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
      scopeLabel: "week",
      controlEyebrow: "Week of",
      resetLabel: "Today",
      previousLabel: "Previous week",
      nextLabel: "Next week",
    };
  }

  const start = startOfWeek(startOfMonth(date), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: WEEK_STARTS_ON });

  return {
    start,
    endExclusive: addDays(end, 1),
    days: eachDayOfInterval({ start, end }),
    label: format(date, "MMMM yyyy"),
    scopeLabel: "month",
    controlEyebrow: "Month of",
    resetLabel: "Today",
    previousLabel: "Previous month",
    nextLabel: "Next month",
  };
}

export function shiftDate(
  date: Date,
  viewMode: CalendarViewMode,
  direction: -1 | 1,
) {
  if (viewMode === "day") {
    return direction === 1 ? addDays(date, 1) : subDays(date, 1);
  }

  if (viewMode === "week") {
    return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
  }

  return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
}
