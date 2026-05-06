import type { CalendarTab, CalendarViewMode } from "../../lib/calendar";
import {
  addLabDays,
  addLabMonths,
  addLabWeeks,
  eachLabDayOfInterval,
  endOfLabMonth,
  endOfLabWeek,
  formatLabDate,
  getCurrentTimestamp,
  getLabDayBounds,
  getLabDayStart,
  parseLabDayKey,
  startOfLabMonth,
  startOfLabWeek,
} from "../../lib/lab-time";

export const WEEK_STARTS_ON = 1 as const;
export const DEFAULT_CALENDAR_VIEW_MODE = "day" as const;
export const DEFAULT_CALENDAR_TAB = "services" as const;

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
    const start = getLabDayStart(date);

    return {
      start,
      endExclusive: getLabDayBounds(start).endExclusive,
      days: [start],
      label: formatLabDate(start, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      scopeLabel: "today",
      controlEyebrow: "Selected day",
      resetLabel: "Today",
      previousLabel: "Previous day",
      nextLabel: "Next day",
    };
  }

  if (viewMode === "week") {
    const start = startOfLabWeek(date, WEEK_STARTS_ON);
    const end = endOfLabWeek(date, WEEK_STARTS_ON);
    const days = eachLabDayOfInterval({ start, end });

    return {
      start,
      endExclusive: getLabDayBounds(end).endExclusive,
      days,
      label: `${formatLabDate(start, { month: "short", day: "numeric" })} - ${formatLabDate(end, { month: "short", day: "numeric" })}`,
      scopeLabel: "week",
      controlEyebrow: "Week of",
      resetLabel: "Today",
      previousLabel: "Previous week",
      nextLabel: "Next week",
    };
  }

  const monthStart = startOfLabMonth(date);
  const monthEnd = endOfLabMonth(date);
  const start = startOfLabWeek(monthStart, WEEK_STARTS_ON);
  const end = endOfLabWeek(monthEnd, WEEK_STARTS_ON);
  const days = eachLabDayOfInterval({ start, end });

  return {
    start,
    endExclusive: getLabDayBounds(end).endExclusive,
    days,
    label: formatLabDate(date, { month: "long", year: "numeric" }),
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
    return addLabDays(date, direction);
  }

  if (viewMode === "week") {
    return addLabWeeks(date, direction);
  }

  return addLabMonths(date, direction);
}

export function resolveCalendarViewMode(
  value: string | null | undefined,
): CalendarViewMode {
  return value === "week" || value === "month"
    ? value
    : DEFAULT_CALENDAR_VIEW_MODE;
}

export function resolveCalendarTab(
  value: string | null | undefined,
  canViewResources: boolean,
): CalendarTab {
  return canViewResources && value === "resources"
    ? "resources"
    : DEFAULT_CALENDAR_TAB;
}

export function getCalendarSelectedDate(
  dateKey: string | null | undefined,
  referenceTime = getCurrentTimestamp(),
) {
  return (
    (dateKey ? parseLabDayKey(dateKey) : null) ?? getLabDayStart(referenceTime)
  );
}
