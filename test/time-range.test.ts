import { describe, expect, test } from "vitest";

import { clipTimeRange, overlapsTimeRange } from "../src/lib/time-range";

describe("time range overlap", () => {
  test("matches bookings that start inside the visible range", () => {
    expect(overlapsTimeRange(200, 260, 100, 300)).toBe(true);
  });

  test("matches bookings that began before the visible range but still overlap it", () => {
    expect(overlapsTimeRange(80, 140, 100, 300)).toBe(true);
  });

  test("excludes bookings that end before the visible range starts", () => {
    expect(overlapsTimeRange(20, 80, 100, 300)).toBe(false);
  });

  test("clips overlapping bookings to the visible range", () => {
    expect(clipTimeRange(80, 140, 100, 300)).toEqual({
      startTime: 100,
      endTime: 140,
    });
    expect(clipTimeRange(250, 360, 100, 300)).toEqual({
      startTime: 250,
      endTime: 300,
    });
  });
});
