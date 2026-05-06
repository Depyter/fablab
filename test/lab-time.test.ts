import { describe, expect, test } from "vitest";

import {
  addLabDays,
  addLabMonths,
  eachLabDayOfInterval,
  endOfLabMonth,
  endOfLabWeek,
  formatLabClockTime,
  formatLabDate,
  formatLabDateNumeric,
  formatLabDecimalHour,
  formatLabTime,
  formatLabTime24,
  getCurrentTimestamp,
  getLabDayBounds,
  getLabDayBoundsMs,
  getLabDayDate,
  getLabDayKey,
  getLabDayStartTimestamp,
  getLabDecimalHour,
  getLabTimeBlock,
  getLabTimeRangeTimestamps,
  getLabTimeTimestamp,
  getLabWeekday,
  getSnappedLabDecimalHour,
  isLabDateBeforeToday,
  isLabTimeInPast,
  isSameLabDay,
  parseLabDayKey,
  startOfLabMonth,
  startOfLabWeek,
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

  test("creates lab day bounds from the lab day instead of the viewer local day", () => {
    const instant = Date.parse("2026-05-05T20:30:00.000Z");
    const day = getLabDayDate(instant);
    const { start, endExclusive } = getLabDayBounds(day);

    expect(day.getFullYear()).toBe(2026);
    expect(day.getMonth()).toBe(4);
    expect(day.getDate()).toBe(6);
    expect(start.toISOString()).toBe("2026-05-05T16:00:00.000Z");
    expect(endExclusive.toISOString()).toBe("2026-05-06T16:00:00.000Z");
  });

  test("parses canonical lab day keys without relying on native Date parsing", () => {
    expect(parseLabDayKey("2026-05-06")?.toISOString()).toBe(
      "2026-05-05T16:00:00.000Z",
    );
    expect(parseLabDayKey("2026-02-31")).toBeNull();
    expect(parseLabDayKey("2026/05/06")).toBeNull();
  });

  test("formats canonical lab date and time labels for booking UI", () => {
    const instant = Date.parse("2026-05-06T13:05:00.000Z");

    expect(formatLabDateNumeric(instant)).toBe("05/06/2026");
    expect(
      formatLabDate(instant, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    ).toBe("Wednesday, May 6");
    expect(formatLabTime24(instant)).toBe("21:05");
    expect(formatLabClockTime("21:05")).toBe("9:05 PM");
    expect(formatLabDecimalHour(9)).toBe("9AM");
    expect(formatLabDecimalHour(13.5)).toBe("1:30");
    expect(
      getLabTimeBlock({
        startTime: instant,
        endTime: instant + 30 * 60 * 1000,
      }),
    ).toEqual({
      start: "21:05",
      end: "21:35",
    });
  });

  test("builds canonical timestamps from a selected lab date and time range", () => {
    const selectedDate = Date.parse("2026-05-06T03:00:00.000Z");

    expect(getLabDayStartTimestamp(selectedDate)).toBe(
      Date.parse("2026-05-05T16:00:00.000Z"),
    );
    expect(getLabTimeTimestamp(selectedDate, "09:30")).toBe(
      Date.parse("2026-05-06T01:30:00.000Z"),
    );
    expect(
      getLabTimeRangeTimestamps({
        date: selectedDate,
        startTime: "09:30",
        endTime: "11:00",
      }),
    ).toEqual({
      date: Date.parse("2026-05-05T16:00:00.000Z"),
      startTime: Date.parse("2026-05-06T01:30:00.000Z"),
      endTime: Date.parse("2026-05-06T03:00:00.000Z"),
    });
    expect(getLabDayBoundsMs(selectedDate)).toEqual({
      startTime: Date.parse("2026-05-05T16:00:00.000Z"),
      endTime: Date.parse("2026-05-06T16:00:00.000Z"),
    });
  });

  test("compares days and past/future state in lab time instead of viewer local time", () => {
    const referenceTime = Date.parse("2026-05-06T02:15:00.000Z");
    const earlierInstant = Date.parse("2026-05-05T20:30:00.000Z");
    const sameLabDayLater = Date.parse("2026-05-06T10:30:00.000Z");

    expect(isSameLabDay(earlierInstant, sameLabDayLater)).toBe(true);
    expect(
      isLabDateBeforeToday(
        Date.parse("2026-05-05T08:00:00.000Z"),
        referenceTime,
      ),
    ).toBe(true);
    expect(
      isLabDateBeforeToday(
        Date.parse("2026-05-06T08:00:00.000Z"),
        referenceTime,
      ),
    ).toBe(false);
    expect(isLabTimeInPast(sameLabDayLater, "09:00", referenceTime)).toBe(true);
    expect(isLabTimeInPast(sameLabDayLater, "11:00", referenceTime)).toBe(
      false,
    );
  });

  test("supports lab-aware week and month interval math", () => {
    const instant = Date.parse("2026-05-06T03:00:00.000Z");

    expect(getLabWeekday(instant)).toBe(3);
    expect(getLabDayKey(startOfLabWeek(instant, 1))).toBe("2026-05-04");
    expect(getLabDayKey(endOfLabWeek(instant, 1))).toBe("2026-05-10");
    expect(getLabDayKey(startOfLabMonth(instant))).toBe("2026-05-01");
    expect(getLabDayKey(endOfLabMonth(instant))).toBe("2026-05-31");
    expect(
      eachLabDayOfInterval({
        start: startOfLabWeek(instant, 1),
        end: endOfLabWeek(instant, 1),
      }).map((day) => getLabDayKey(day)),
    ).toEqual([
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-09",
      "2026-05-10",
    ]);
  });

  test("clamps month shifts and exposes a single current timestamp helper", () => {
    const januaryThirtyFirst = Date.parse("2026-01-31T03:00:00.000Z");

    expect(getLabDayKey(addLabDays(januaryThirtyFirst, 2))).toBe("2026-02-02");
    expect(getLabDayKey(addLabMonths(januaryThirtyFirst, 1))).toBe(
      "2026-02-28",
    );
    expect(typeof getCurrentTimestamp()).toBe("number");
  });
});
