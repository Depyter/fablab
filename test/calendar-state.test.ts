import { describe, expect, test } from "vitest";

import {
  getCalendarSelectedDate,
  getVisibleRange,
  resolveCalendarTab,
  resolveCalendarViewMode,
  shiftDate,
} from "../src/components/calendar/calendar-state";
import { getLabDayKey } from "../src/lib/lab-time";

describe("calendar state", () => {
  test("week view starts from the calendar week boundary", () => {
    const selectedDate = new Date(2026, 4, 6, 15, 30);
    const range = getVisibleRange(selectedDate, "week");

    expect(getLabDayKey(range.start)).toBe("2026-05-04");
    expect(range.days).toHaveLength(7);
    expect(range.days.map((day) => getLabDayKey(day))).toEqual([
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-09",
      "2026-05-10",
    ]);
    expect(range.label).toBe("May 4 - May 10");
  });

  test("week navigation still advances in seven-day increments", () => {
    const selectedDate = new Date(2026, 4, 6, 15, 30);

    const nextWeek = shiftDate(selectedDate, "week", 1);
    const previousWeek = shiftDate(selectedDate, "week", -1);

    expect(getLabDayKey(nextWeek)).toBe("2026-05-13");
    expect(getLabDayKey(previousWeek)).toBe("2026-04-29");
    expect(getVisibleRange(nextWeek, "week").label).toBe("May 11 - May 17");
    expect(getVisibleRange(previousWeek, "week").label).toBe("Apr 27 - May 3");
  });

  test("month view expands to full lab weeks around the selected month", () => {
    const selectedDate = new Date(2026, 4, 6, 15, 30);
    const range = getVisibleRange(selectedDate, "month");

    expect(range.label).toBe("May 2026");
    expect(getLabDayKey(range.start)).toBe("2026-04-27");
    expect(getLabDayKey(range.endExclusive)).toBe("2026-06-01");
    expect(range.days).toHaveLength(35);
    expect(getLabDayKey(range.days[0])).toBe("2026-04-27");
    expect(getLabDayKey(range.days[34])).toBe("2026-05-31");
  });

  test("sanitizes calendar url state before rendering", () => {
    expect(resolveCalendarViewMode("week")).toBe("week");
    expect(resolveCalendarViewMode("invalid")).toBe("day");
    expect(resolveCalendarTab("resources", true)).toBe("resources");
    expect(resolveCalendarTab("resources", false)).toBe("services");
    expect(getLabDayKey(getCalendarSelectedDate("2026-05-06"))).toBe(
      "2026-05-06",
    );
    expect(
      getLabDayKey(getCalendarSelectedDate("invalid", Date.UTC(2026, 4, 7))),
    ).toBe("2026-05-07");
  });
});
