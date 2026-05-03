import { addDays } from "date-fns";

export const LAB_TIME_ZONE = "Asia/Manila";

function getFormatter(
  options: Intl.DateTimeFormatOptions,
) {
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

export function getLabDayStart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`;
  const day = `${date.getDate()}`;

  return new Date(`${month}/${day}/${year} 00:00:00 GMT+0800`);
}

export function getLabDayBounds(date: Date) {
  const start = getLabDayStart(date);

  return {
    start,
    endExclusive: addDays(start, 1),
  };
}

export function getLabDayKey(date: Date | number) {
  const { year, month, day } = getParts(date);

  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

export function getLabDecimalHour(date: Date | number) {
  const { hour, minute } = getParts(date);

  return hour + minute / 60;
}

export function getSnappedLabDecimalHour(
  date: Date | number,
  ceil = false,
) {
  const decimal = getLabDecimalHour(date);

  return ceil ? Math.ceil(decimal * 2) / 2 : Math.floor(decimal * 2) / 2;
}

export function formatLabTime(date: Date | number) {
  return getFormatter({
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}
