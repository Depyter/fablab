export function overlapsTimeRange(
  startTime: number,
  endTime: number,
  rangeStart: number,
  rangeEndExclusive: number,
) {
  return startTime < rangeEndExclusive && endTime > rangeStart;
}

export function clipTimeRange(
  startTime: number,
  endTime: number,
  rangeStart: number,
  rangeEndExclusive: number,
) {
  if (!overlapsTimeRange(startTime, endTime, rangeStart, rangeEndExclusive)) {
    return null;
  }

  return {
    startTime: Math.max(startTime, rangeStart),
    endTime: Math.min(endTime, rangeEndExclusive),
  };
}
