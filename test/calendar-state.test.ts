import { describe, expect, test } from "vitest";

import {
  getVisibleRange,
  shiftDate,
} from "../src/components/calendar/calendar-state";

describe("calendar state", () => {
  test("week view starts from the selected day", () => {
    const selectedDate = new Date(2026, 4, 6, 15, 30);
    const range = getVisibleRange(selectedDate, "week");

    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(4);
    expect(range.start.getDate()).toBe(6);
    expect(range.start.getHours()).toBe(0);
    expect(range.days).toHaveLength(7);
    expect(range.days.map((day) => day.getDate())).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(range.label).toBe("May 6 - May 12");
  });

  test("week navigation still advances in seven-day increments", () => {
    const selectedDate = new Date(2026, 4, 6, 15, 30);

    const nextWeek = shiftDate(selectedDate, "week", 1);
    const previousWeek = shiftDate(selectedDate, "week", -1);

    expect(nextWeek.getDate()).toBe(13);
    expect(previousWeek.getDate()).toBe(29);
    expect(previousWeek.getMonth()).toBe(3);
  });
});
