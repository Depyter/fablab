import { describe, expect, test } from "vitest";

import {
  DAY_END,
  DAY_START,
  getCalendarBookingColor,
  getCalendarProjectStatus,
  getCalendarSlotIndex,
  normalizeCalendarBookingToDayWindow,
} from "../src/lib/calendar";

describe("calendar shared domain", () => {
  test("normalizes unknown project statuses to pending", () => {
    expect(getCalendarProjectStatus("approved")).toBe("approved");
    expect(getCalendarProjectStatus("not-a-real-status")).toBe("pending");
    expect(getCalendarBookingColor("not-a-real-status")).toContain("amber");
  });

  test("uses shared half-hour slot indexing", () => {
    expect(getCalendarSlotIndex(DAY_START)).toBe(0);
    expect(getCalendarSlotIndex(DAY_START + 1.5)).toBe(3);
    expect(getCalendarSlotIndex(DAY_END)).toBe((DAY_END - DAY_START) * 2);
  });

  test("clips and snaps booking windows into the visible lab day", () => {
    const window = normalizeCalendarBookingToDayWindow(
      {
        startTime: Date.parse("2026-05-06T01:40:00.000Z"),
        endTime: Date.parse("2026-05-06T03:10:00.000Z"),
      },
      {
        startTime: Date.parse("2026-05-05T16:00:00.000Z"),
        endTime: Date.parse("2026-05-06T16:00:00.000Z"),
      },
    );

    expect(window).toEqual({
      startTime: 9.5,
      endTime: 11.5,
    });
  });
});
