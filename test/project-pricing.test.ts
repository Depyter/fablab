import { describe, expect, test } from "vitest";

import {
  getDurationMinutesFromTimestampRange,
  getDurationMinutesFromUsageRanges,
  getDurationUnitsFromMinutes,
} from "../src/lib/project-pricing";

describe("project pricing duration helpers", () => {
  test("calculates duration from timestamp ranges", () => {
    const startTime = new Date(2026, 4, 7, 9, 0, 0, 0).getTime();
    const endTime = new Date(2026, 4, 7, 11, 30, 0, 0).getTime();

    expect(getDurationMinutesFromTimestampRange(startTime, endTime)).toBe(150);
  });

  test("clamps negative timestamp durations to zero", () => {
    const startTime = new Date(2026, 4, 7, 11, 30, 0, 0).getTime();
    const endTime = new Date(2026, 4, 7, 9, 0, 0, 0).getTime();

    expect(getDurationMinutesFromTimestampRange(startTime, endTime)).toBe(0);
  });

  test("aggregates total duration across usage ranges", () => {
    const base = new Date(2026, 4, 7, 9, 0, 0, 0).getTime();

    expect(
      getDurationMinutesFromUsageRanges([
        {
          startTime: base,
          endTime: base + 90 * 60 * 1000,
        },
        {
          startTime: base + 3 * 60 * 60 * 1000,
          endTime: base + 5 * 60 * 60 * 1000,
        },
      ]),
    ).toBe(210);
  });

  test("converts duration minutes into pricing units", () => {
    expect(getDurationUnitsFromMinutes(180, "hour")).toBe(3);
    expect(getDurationUnitsFromMinutes(2880, "day")).toBe(2);
    expect(getDurationUnitsFromMinutes(45, "minute")).toBe(45);
  });
});
