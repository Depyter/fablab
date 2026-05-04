"use client";

import * as React from "react";
import type { Id } from "@convex/_generated/dataModel";
import type { CalendarRangeEvent, CalendarViewMode } from "@/lib/calendar";
import {
  CALENDAR_WEEK_DAY_MIN_WIDTH,
  CALENDAR_WEEK_HOUR_ROW_MIN_HEIGHT,
  CALENDAR_WEEK_MIN_GRID_HEIGHT,
  CALENDAR_WEEK_MIN_TOTAL_HEIGHT,
  CALENDAR_WEEK_TIME_COL_WIDTH,
  CALENDAR_WEEK_TOTAL_HOURS,
  clampToCalendarDay,
  DAY_START,
  packCalendarTracks,
} from "@/lib/calendar";

import { cn } from "@/lib/utils";
import {
  formatLabDate,
  formatLabDecimalHour,
  formatLabTime,
  getCurrentTimestamp,
  getLabDayBounds,
  getLabDayKey,
  getLabDecimalHour,
  isSameLabDay,
  isSameLabMonth,
} from "@/lib/lab-time";
import { clipTimeRange, overlapsTimeRange } from "@/lib/time-range";
import {
  canShowMonthOverflowLabel,
  getMonthVisibleEventLimit,
  MONTH_CELL_MIN_HEIGHT,
  MONTH_DAY_MIN_WIDTH,
} from "./month-layout";

interface CalendarRangeViewProps {
  anchorDate: Date;
  days: Date[];
  events: CalendarRangeEvent[];
  viewMode: Exclude<CalendarViewMode, "day">;
  isLoading?: boolean;
  onSelectDay?: (date: Date) => void;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}

interface WeekEventLayout extends CalendarRangeEvent {
  topPercent: number;
  heightPercent: number;
  trackIndex: number;
  trackCount: number;
}

const WEEK_TIME_COL_WIDTH = CALENDAR_WEEK_TIME_COL_WIDTH;
const WEEK_DAY_MIN_WIDTH = CALENDAR_WEEK_DAY_MIN_WIDTH;
const WEEK_HOUR_ROW_MIN_HEIGHT = CALENDAR_WEEK_HOUR_ROW_MIN_HEIGHT;
const WEEK_TOTAL_HOURS = CALENDAR_WEEK_TOTAL_HOURS;
const WEEK_MIN_GRID_HEIGHT = CALENDAR_WEEK_MIN_GRID_HEIGHT;
const WEEK_MIN_TOTAL_HEIGHT = CALENDAR_WEEK_MIN_TOTAL_HEIGHT;
const WEEK_HOURS = Array.from(
  { length: WEEK_TOTAL_HOURS + 1 },
  (_, index) => DAY_START + index,
);
const WEEK_HALF_HOUR_MARKS = Array.from(
  { length: WEEK_TOTAL_HOURS * 2 + 1 },
  (_, index) => DAY_START + index * 0.5,
);

function toDayKey(value: Date | number) {
  return getLabDayKey(value);
}

function isCurrentLabDay(value: Date | number) {
  return isSameLabDay(value, getCurrentTimestamp());
}

function formatEventTime(startTime: number, endTime: number) {
  return `${formatLabTime(startTime)}-${formatLabTime(endTime)}`;
}

function formatBookingCount(count: number) {
  return `${count} ${count === 1 ? "booking" : "bookings"}`;
}

function formatWeekAxisLabel(decimalHour: number) {
  return formatLabDecimalHour(decimalHour);
}

function getDecimalHour(time: number) {
  return getLabDecimalHour(time);
}

function buildWeekEventLayouts(events: CalendarRangeEvent[], day: Date) {
  const { start: dayStartDate, endExclusive: dayEndDate } =
    getLabDayBounds(day);
  const dayStart = dayStartDate.getTime();
  const dayEnd = dayEndDate.getTime();
  const clipped = events
    .map((event) => {
      const clippedRange = clipTimeRange(
        event.startTime,
        event.endTime,
        dayStart,
        dayEnd,
      );

      if (!clippedRange) return null;

      const start = clampToCalendarDay(getDecimalHour(clippedRange.startTime));
      const end = clampToCalendarDay(getDecimalHour(clippedRange.endTime));

      return {
        ...event,
        start,
        end,
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .filter((event) => event.end > event.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  return packCalendarTracks(clipped, (event) => ({
    startTime: event.start,
    endTime: event.end,
  })).map(({ item, trackIndex, trackCount }) => ({
    ...item,
    trackIndex,
    trackCount,
    topPercent: ((item.start - DAY_START) / WEEK_TOTAL_HOURS) * 100,
    heightPercent: Math.max(
      ((item.end - item.start) / WEEK_TOTAL_HOURS) * 100,
      (26 / WEEK_MIN_GRID_HEIGHT) * 100,
    ),
  }));
}

function buildEventsByDay(days: Date[], events: CalendarRangeEvent[]) {
  const grouped = new Map<string, CalendarRangeEvent[]>();

  for (const day of days) {
    const { start, endExclusive } = getLabDayBounds(day);
    const dayStart = start.getTime();
    const dayEnd = endExclusive.getTime();
    const dayEvents = events.filter((event) =>
      overlapsTimeRange(event.startTime, event.endTime, dayStart, dayEnd),
    );

    dayEvents.sort((left, right) => left.startTime - right.startTime);
    grouped.set(toDayKey(day), dayEvents);
  }

  return grouped;
}

function buildWeekLayoutsByDay(
  days: Date[],
  eventsByDay: Map<string, CalendarRangeEvent[]>,
) {
  const layouts = new Map<string, WeekEventLayout[]>();

  for (const day of days) {
    const dayKey = toDayKey(day);
    layouts.set(
      dayKey,
      buildWeekEventLayouts(eventsByDay.get(dayKey) ?? [], day),
    );
  }

  return layouts;
}

function EventCard({
  event,
  compact = false,
  showDetails = true,
  onOpenProjectDetails,
}: {
  event: CalendarRangeEvent;
  compact?: boolean;
  showDetails?: boolean;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}) {
  const canOpenProjectDetails =
    event.projectId !== null && onOpenProjectDetails !== undefined;

  return (
    <button
      type="button"
      disabled={!canOpenProjectDetails}
      onClick={() => event.projectId && onOpenProjectDetails?.(event.projectId)}
      title={showDetails ? undefined : event.projectAlias}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border text-left shadow-sm transition-colors",
        event.slotClassName,
        event.isPendingReview && "border-2 border-dashed",
        canOpenProjectDetails
          ? "cursor-pointer hover:opacity-90"
          : "cursor-default",
        compact ? "min-h-8 px-2.5 py-1.5" : "px-3 py-2.5",
      )}
    >
      <div className={cn(compact ? "pl-2.5" : "pl-3")}>
        <div
          className={cn(
            "truncate font-semibold leading-tight text-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {event.projectAlias}
        </div>
        {showDetails ? (
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">
              {event.secondaryLabel}
            </span>
            <span className="shrink-0">
              {formatEventTime(event.startTime, event.endTime)}
            </span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function WeekEventBlock({
  event,
  onOpenProjectDetails,
}: {
  event: WeekEventLayout;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}) {
  const canOpenProjectDetails =
    event.projectId !== null && onOpenProjectDetails !== undefined;

  return (
    <button
      type="button"
      disabled={!canOpenProjectDetails}
      onClick={() => event.projectId && onOpenProjectDetails?.(event.projectId)}
      className={cn(
        "absolute z-10 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition-colors",
        event.slotClassName,
        event.isPendingReview && "border-2 border-dashed",
        canOpenProjectDetails
          ? "cursor-pointer hover:opacity-90"
          : "cursor-default",
      )}
      style={{
        top: `calc(${event.topPercent}% + 2px)`,
        height: `calc(${event.heightPercent}% - 4px)`,
        left: `calc(${(event.trackIndex / event.trackCount) * 100}% + 2px)`,
        width: `calc(${100 / event.trackCount}% - 4px)`,
      }}
    >
      <div className="pl-2.5">
        <div className="truncate text-md font-semibold text-foreground">
          {event.projectAlias}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {event.secondaryLabel}
        </div>
      </div>
    </button>
  );
}

export function CalendarRangeView({
  anchorDate,
  days,
  events,
  viewMode,
  isLoading = false,
  onSelectDay,
  onOpenProjectDetails,
}: CalendarRangeViewProps) {
  const eventsByDay = buildEventsByDay(days, events);
  const weekMinWidth = WEEK_TIME_COL_WIDTH + days.length * WEEK_DAY_MIN_WIDTH;
  const weekLayoutsByDay = buildWeekLayoutsByDay(days, eventsByDay);
  const monthMinWidth = 7 * MONTH_DAY_MIN_WIDTH;
  const monthRowCount = Math.max(days.length / 7, 1);
  const monthWeekdays = days.slice(0, 7);
  const monthBodyRef = React.useRef<HTMLDivElement | null>(null);
  const [monthRowHeight, setMonthRowHeight] = React.useState(
    MONTH_CELL_MIN_HEIGHT,
  );

  React.useEffect(() => {
    const grid = monthBodyRef.current;

    if (!grid) return;

    const updateMonthRowHeight = () => {
      const nextRowHeight =
        Math.max(grid.scrollHeight, grid.getBoundingClientRect().height) /
        monthRowCount;

      if (Number.isFinite(nextRowHeight) && nextRowHeight > 0) {
        setMonthRowHeight(nextRowHeight);
      }
    };

    updateMonthRowHeight();

    const observer = new ResizeObserver(updateMonthRowHeight);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [monthRowCount]);

  if (viewMode === "week") {
    return (
      <div
        className="flex h-full min-h-0 flex-1 overflow-auto"
        aria-busy={isLoading}
      >
        <div
          className="grid h-full min-h-full min-w-0 flex-1"
          style={{
            width: `max(100%, ${weekMinWidth}px)`,
            minHeight: WEEK_MIN_TOTAL_HEIGHT,
            gridTemplateRows: `auto minmax(${WEEK_MIN_GRID_HEIGHT}px, 1fr)`,
          }}
        >
          <div
            className="sticky top-0 z-20 grid border-b bg-background"
            style={{
              gridTemplateColumns: `${WEEK_TIME_COL_WIDTH}px repeat(${days.length}, minmax(${WEEK_DAY_MIN_WIDTH}px, 1fr))`,
            }}
          >
            <div className="border-r bg-muted/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Time
            </div>

            {days.map((day) => {
              const dayKey = toDayKey(day);
              const dayEvents = eventsByDay.get(toDayKey(day)) ?? [];

              return (
                <div
                  key={dayKey}
                  className="border-r bg-muted/10 px-3 py-2 last:border-r-0"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {formatLabDate(day, { weekday: "short" })}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                        isCurrentLabDay(day)
                          ? "bg-card text-foreground ring-1 ring-border"
                          : "text-foreground",
                      )}
                    >
                      {formatLabDate(day, { day: "numeric" })}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatBookingCount(dayEvents.length)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="grid h-full min-h-0"
            style={{
              gridTemplateColumns: `${WEEK_TIME_COL_WIDTH}px repeat(${days.length}, minmax(${WEEK_DAY_MIN_WIDTH}px, 1fr))`,
            }}
          >
            <div
              className="grid border-r bg-background"
              style={{
                gridTemplateRows: `repeat(${WEEK_TOTAL_HOURS}, minmax(${WEEK_HOUR_ROW_MIN_HEIGHT}px, 1fr))`,
              }}
            >
              {WEEK_HOURS.map((hour, index) => (
                <div
                  key={`week-time-${hour}`}
                  className="border-b border-border/60 px-3"
                  style={{
                    display:
                      index === WEEK_HOURS.length - 1 ? "none" : undefined,
                  }}
                >
                  <span className="-translate-y-2.5 inline-block bg-background pr-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {formatWeekAxisLabel(hour)}
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayKey = toDayKey(day);
              const layouts = weekLayoutsByDay.get(dayKey) ?? [];

              return (
                <div
                  key={`week-column-${dayKey}`}
                  className="relative border-r last:border-r-0"
                  style={{ minHeight: WEEK_MIN_GRID_HEIGHT }}
                >
                  {WEEK_HALF_HOUR_MARKS.map((mark, index) => (
                    <div
                      key={`week-line-${dayKey}-${mark}`}
                      className={cn(
                        "absolute left-0 right-0",
                        index % 2 === 0
                          ? "border-t border-border/60"
                          : "border-t border-dashed border-border/40",
                      )}
                      style={{
                        top: `${((mark - DAY_START) / WEEK_TOTAL_HOURS) * 100}%`,
                      }}
                    />
                  ))}

                  {layouts.map((event) => (
                    <WeekEventBlock
                      key={event.id}
                      event={event}
                      onOpenProjectDetails={onOpenProjectDetails}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 overflow-auto"
      aria-busy={isLoading}
    >
      <div
        className="grid h-full min-h-0 min-w-0 flex-1"
        style={{
          width: `max(100%, ${monthMinWidth}px)`,
          gridTemplateRows: "auto minmax(0, 1fr)",
        }}
      >
        <div
          className="grid border-b bg-muted/10"
          style={{
            gridTemplateColumns: `repeat(7, minmax(${MONTH_DAY_MIN_WIDTH}px, 1fr))`,
          }}
        >
          {monthWeekdays.map((day, index) => (
            <div
              key={`month-weekday-${toDayKey(day)}`}
              className={cn(
                "truncate whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                index === 0 ? "" : "border-l",
              )}
            >
              {formatLabDate(day, { weekday: "long" })}
            </div>
          ))}
        </div>

        <div
          ref={monthBodyRef}
          className="grid min-h-0 border-b border-r bg-background"
          style={{
            gridTemplateColumns: `repeat(7, minmax(${MONTH_DAY_MIN_WIDTH}px, 1fr))`,
            gridTemplateRows: `repeat(${monthRowCount}, minmax(${MONTH_CELL_MIN_HEIGHT}px, 1fr))`,
          }}
        >
          {days.map((day) => {
            const dayEvents = eventsByDay.get(toDayKey(day)) ?? [];
            const isCurrentMonth = isSameLabMonth(day, anchorDate);
            const visibleEventLimit = getMonthVisibleEventLimit(
              monthRowHeight,
              dayEvents.length,
            );
            const visibleDayEvents = dayEvents.slice(0, visibleEventLimit);
            const hiddenEventCount = Math.max(
              dayEvents.length - visibleDayEvents.length,
              0,
            );
            const showOverflowLabel =
              hiddenEventCount > 0 &&
              canShowMonthOverflowLabel(
                monthRowHeight,
                visibleDayEvents.length,
              );

            return (
              <div
                key={toDayKey(day)}
                className={cn(
                  "flex min-h-0 flex-col border-l border-t",
                  isCurrentMonth ? "bg-background" : "bg-muted/10",
                )}
              >
                <button
                  type="button"
                  disabled={onSelectDay === undefined}
                  title={`Open ${formatLabDate(day, { month: "long", day: "numeric" })} in day view`}
                  className={cn(
                    "flex items-center justify-between gap-2 border-b bg-muted/10 px-3 py-2 text-left",
                    onSelectDay === undefined
                      ? "cursor-default"
                      : "transition-colors hover:bg-muted/20",
                  )}
                  onClick={() => onSelectDay?.(day)}
                >
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                      isCurrentLabDay(day) && "bg-card ring-1 ring-border",
                    )}
                  >
                    {formatLabDate(day, { day: "numeric" })}
                  </span>
                  {dayEvents.length > 0 ? (
                    <span className="truncate text-[10px] font-medium text-muted-foreground">
                      {formatBookingCount(dayEvents.length)}
                    </span>
                  ) : null}
                </button>

                <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
                  {visibleDayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      compact
                      event={event}
                      showDetails={false}
                      onOpenProjectDetails={onOpenProjectDetails}
                    />
                  ))}
                  {showOverflowLabel ? (
                    <div className="px-2 text-[10px] font-medium text-muted-foreground">
                      +{hiddenEventCount} more
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
