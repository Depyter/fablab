export const LAB_TIME_ZONE = "Asia/Manila";
const DAY_MS = 24 * 60 * 60 * 1000;

function getFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: LAB_TIME_ZONE,
    ...options,
  });
}

function getParts(date: Date | number) {
  const parts = getFormatter({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value),
  };
}

function createUtcMarker(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function getPartsFromUtcMarker(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function padLabDatePart(value: number) {
  return `${value}`.padStart(2, "0");
}

export function getLabDayDate(date: Date | number) {
  const { year, month, day } = getParts(date);

  return new Date(year, month - 1, day);
}

export function createLabDayStart(year: number, month: number, day: number) {
  return new Date(
    `${year}-${padLabDatePart(month)}-${padLabDatePart(day)}T00:00:00+08:00`,
  );
}

export function getLabDayStart(date: Date | number) {
  const { year, month, day } = getParts(date);

  return createLabDayStart(year, month, day);
}

export function addLabDays(date: Date | number, amount: number) {
  const { year, month, day } = getParts(date);
  const marker = createUtcMarker(year, month, day);
  marker.setUTCDate(marker.getUTCDate() + amount);
  const nextParts = getPartsFromUtcMarker(marker);

  return createLabDayStart(nextParts.year, nextParts.month, nextParts.day);
}

export function addLabWeeks(date: Date | number, amount: number) {
  return addLabDays(date, amount * 7);
}

export function addLabMonths(date: Date | number, amount: number) {
  const { year, month, day } = getParts(date);
  const monthIndex = year * 12 + (month - 1) + amount;
  const nextYear = Math.floor(monthIndex / 12);
  const nextMonth = (((monthIndex % 12) + 12) % 12) + 1;
  const daysInMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();

  return createLabDayStart(nextYear, nextMonth, Math.min(day, daysInMonth));
}

export function getLabWeekday(date: Date | number) {
  const { year, month, day } = getParts(date);

  return createUtcMarker(year, month, day).getUTCDay();
}

export function startOfLabWeek(date: Date | number, weekStartsOn: number) {
  const weekday = getLabWeekday(date);
  const offset = (weekday - weekStartsOn + 7) % 7;

  return addLabDays(date, -offset);
}

export function endOfLabWeek(date: Date | number, weekStartsOn: number) {
  return addLabDays(startOfLabWeek(date, weekStartsOn), 6);
}

export function startOfLabMonth(date: Date | number) {
  const { year, month } = getParts(date);

  return createLabDayStart(year, month, 1);
}

export function endOfLabMonth(date: Date | number) {
  return addLabDays(addLabMonths(startOfLabMonth(date), 1), -1);
}

export function eachLabDayOfInterval({
  start,
  end,
}: {
  start: Date | number;
  end: Date | number;
}) {
  const startTime = getLabDayStart(start).getTime();
  const endTime = getLabDayStart(end).getTime();
  const dayCount = Math.floor((endTime - startTime) / DAY_MS) + 1;

  return Array.from({ length: dayCount }, (_, index) =>
    addLabDays(start, index),
  );
}

export function getLabDayBounds(date: Date | number) {
  const start = getLabDayStart(date);

  return {
    start,
    endExclusive: addLabDays(start, 1),
  };
}

export function formatLabDate(
  date: Date | number,
  options: Intl.DateTimeFormatOptions,
) {
  return getFormatter(options).format(new Date(date));
}

export function getLabDayKey(date: Date | number) {
  const { year, month, day } = getParts(date);

  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

export function getLabDecimalHour(date: Date | number) {
  const { hour, minute } = getParts(date);

  return hour + minute / 60;
}

export function getSnappedLabDecimalHour(date: Date | number, ceil = false) {
  const decimal = getLabDecimalHour(date);

  return ceil ? Math.ceil(decimal * 2) / 2 : Math.floor(decimal * 2) / 2;
}

export function formatLabTime(date: Date | number) {
  return formatLabDate(date, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function isSameLabMonth(left: Date | number, right: Date | number) {
  const leftParts = getParts(left);
  const rightParts = getParts(right);

  return (
    leftParts.year === rightParts.year && leftParts.month === rightParts.month
  );
}
