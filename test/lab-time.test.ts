import { describe, expect, test } from "vitest";

import {
  formatLabTime,
  getLabDayBounds,
  getLabDayKey,
  getLabDecimalHour,
  getSnappedLabDecimalHour,
} from "../src/lib/lab-time";

describe("lab time helpers", () => {
  test("formats booking timestamps in Asia/Manila", () => {
    const instant = Date.parse("2026-05-06T01:30:00.000Z");

    expect(getLabDayKey(instant)).toBe("2026-05-06");
    expect(getLabDecimalHour(instant)).toBe(9.5);
    expect(getSnappedLabDecimalHour(instant)).toBe(9.5);
    expect(formatLabTime(instant)).toBe("9:30 AM");
  });

  test("snaps lab timestamps to half-hour slots", () => {
    const instant = Date.parse("2026-05-06T01:40:00.000Z");

    expect(getSnappedLabDecimalHour(instant)).toBe(9.5);
    expect(getSnappedLabDecimalHour(instant, true)).toBe(10);
  });

  test("creates lab day bounds from a calendar date", () => {
    const day = new Date(2026, 4, 6, 12, 0);
    const { start, endExclusive } = getLabDayBounds(day);

    expect(start.toISOString()).toBe("2026-05-05T16:00:00.000Z");
    expect(endExclusive.toISOString()).toBe("2026-05-06T16:00:00.000Z");
  });
});
