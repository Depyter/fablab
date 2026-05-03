import { describe, expect, test } from "vitest";

import {
  canShowMonthOverflowLabel,
  getMonthVisibleEventLimit,
} from "../src/components/calendar/month-layout";

describe("calendar range month fitting", () => {
  test("minimum month row height still shows two bookings", () => {
    expect(getMonthVisibleEventLimit(152, 5)).toBe(2);
    expect(canShowMonthOverflowLabel(152, 2)).toBe(true);
  });

  test("taller month rows reveal more bookings before truncating", () => {
    expect(getMonthVisibleEventLimit(208, 5)).toBe(3);
    expect(canShowMonthOverflowLabel(208, 3)).toBe(true);
    expect(getMonthVisibleEventLimit(260, 6)).toBe(4);
    expect(canShowMonthOverflowLabel(260, 4)).toBe(true);
  });
});
