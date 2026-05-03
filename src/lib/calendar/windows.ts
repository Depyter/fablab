import { getSnappedLabDecimalHour } from "../lab-time";
import { clipTimeRange } from "../time-range";

import { DAY_END, DAY_START } from "./constants";
import type { CalendarAbsoluteTimeRange, CalendarDayWindow } from "./types";

export function normalizeCalendarBookingToDayWindow(
  booking: CalendarAbsoluteTimeRange,
  dayBounds: { startTime: number; endTime: number },
): CalendarDayWindow | null {
  const clippedRange = clipTimeRange(
    booking.startTime,
    booking.endTime,
    dayBounds.startTime,
    dayBounds.endTime,
  );

  if (!clippedRange) return null;

  const startTime = Math.max(
    getSnappedLabDecimalHour(clippedRange.startTime, false),
    DAY_START,
  );
  const endTime = Math.min(
    getSnappedLabDecimalHour(clippedRange.endTime, true),
    DAY_END,
  );

  if (endTime <= startTime) return null;

  return {
    startTime,
    endTime,
  };
}
