export const DAY_START = 9;
export const DAY_END = 18;
export const SLOTS_PER_HOUR = 2;
export const SLOT_STEP = 1 / SLOTS_PER_HOUR;
export const TOTAL_SLOTS = (DAY_END - DAY_START) * SLOTS_PER_HOUR;
export const DAY_HOURS = DAY_END - DAY_START;

export const HEADER_SLOTS = Array.from(
  { length: TOTAL_SLOTS + 1 },
  (_, index) => DAY_START + index * SLOT_STEP,
);

export function clampToCalendarDay(decimalHour: number) {
  return Math.min(Math.max(decimalHour, DAY_START), DAY_END);
}

export function getCalendarSlotIndex(decimalHour: number) {
  return Math.round((decimalHour - DAY_START) * SLOTS_PER_HOUR);
}
