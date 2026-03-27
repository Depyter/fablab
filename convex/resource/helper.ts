type usageTime = {
  start: number;
  end: number;
};

/**
 * Checks if the startTime and endTime of two ranges are overlapping
 * @param a - usageTime
 * @param b - usageTime
 * @returns True if they overlap, otherwise false if do not overlap
 */
export function checkOverlap(a: usageTime, b: usageTime): boolean {
  if (a.start < b.end && a.end > b.start) return true;
  else return false;
}
