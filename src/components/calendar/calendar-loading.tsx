"use client";

import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarTab, CalendarViewMode } from "@/lib/calendar";
import {
  CALENDAR_DAY_HEADER_HEIGHT,
  CALENDAR_DAY_LEADING_COL_WIDTH,
  CALENDAR_DAY_SLOT_WIDTH,
  CALENDAR_MONTH_CELL_MIN_HEIGHT,
  DAY_END,
  DAY_START,
  HEADER_SLOTS,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { BookingCalendarToolbarSkeleton } from "./booking-calendar-toolbar";

const loadingRows = [
  {
    labelWidth: "w-28",
    slots: [
      { start: 1, span: 4 },
      { start: 9, span: 3 },
    ],
  },
  {
    labelWidth: "w-24",
    slots: [{ start: 5, span: 5 }],
  },
  {
    labelWidth: "w-32",
    slots: [
      { start: 0, span: 3 },
      { start: 12, span: 4 },
    ],
  },
  {
    labelWidth: "w-20",
    slots: [{ start: 7, span: 6 }],
  },
] as const;

const mobileLoadingRows = [
  {
    headerWidth: "w-32",
    entries: [
      { titleWidth: "w-28", timeWidth: "w-20" },
      { titleWidth: "w-24", timeWidth: "w-16" },
    ],
  },
  {
    headerWidth: "w-24",
    entries: [
      { titleWidth: "w-32", timeWidth: "w-20" },
      { titleWidth: "w-20", timeWidth: "w-16" },
    ],
  },
] as const;

const weekSkeletonDays = Array.from({ length: 7 }, (_, index) => index);
const monthSkeletonCells = Array.from({ length: 35 }, (_, index) => index);
const weekHourSkeletons = Array.from(
  { length: DAY_END - DAY_START },
  (_, index) => DAY_START + index,
);
const LOADING_TABLE_WIDTH =
  CALENDAR_DAY_LEADING_COL_WIDTH +
  HEADER_SLOTS.length * CALENDAR_DAY_SLOT_WIDTH;

function formatLoadingTime(decimalHour: number) {
  const hours = Math.floor(decimalHour);
  const minutes = (decimalHour % 1) * 60;

  return format(
    setMinutes(setHours(startOfDay(new Date()), hours), minutes),
    minutes === 0 ? "ha" : "h:mm",
  );
}

function DayLoadingState({
  activeTab,
}: {
  activeTab: CalendarTab;
}) {
  return (
    <>
      <div className="hidden min-h-0 flex-1 md:flex">
        <div className="relative flex-1 overflow-auto">
          <table
            style={{
              width: LOADING_TABLE_WIDTH,
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <colgroup>
              <col style={{ width: CALENDAR_DAY_LEADING_COL_WIDTH }} />
              {HEADER_SLOTS.map((slot) => (
                <col
                  key={`calendar-loading-col-${slot}`}
                  style={{ width: CALENDAR_DAY_SLOT_WIDTH }}
                />
              ))}
            </colgroup>
            <thead>
              <tr
                style={{
                  height: CALENDAR_DAY_HEADER_HEIGHT,
                  background: "var(--fab-bg-sidebar)",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                }}
              >
                <th
                  style={{
                    width: CALENDAR_DAY_LEADING_COL_WIDTH,
                    position: "sticky",
                    left: 0,
                    zIndex: 20,
                    background: "var(--fab-bg-sidebar)",
                    borderBottom: "1px solid var(--fab-border-md)",
                    borderRight: "1px solid var(--fab-border-md)",
                    textAlign: "left",
                    paddingLeft: 12,
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--fab-text-muted)",
                  }}
                >
                  {activeTab === "resources" ? "RESOURCES" : "SERVICES"}
                </th>

                {HEADER_SLOTS.map((slot) => {
                  const isHour = slot % 1 === 0;

                  return (
                    <th
                      key={`calendar-loading-header-${slot}`}
                      style={{
                        background: "var(--fab-bg-sidebar)",
                        borderBottom: "1px solid var(--fab-border-md)",
                        borderLeft: "1px solid var(--fab-border)",
                        textAlign: "left",
                        paddingLeft: 4,
                        overflow: "hidden",
                        fontSize: 10,
                        fontWeight: 500,
                        color: "var(--fab-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isHour ? formatLoadingTime(slot) : ""}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loadingRows.map((row, rowIndex) => (
                <tr
                  key={`calendar-loading-row-${rowIndex}`}
                  style={{ height: 40 }}
                >
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 4,
                      background: "var(--fab-bg-main)",
                      borderBottom: "1px solid var(--fab-border-md)",
                      borderRight: "1px solid var(--fab-border-md)",
                      verticalAlign: "middle",
                      padding: 0,
                    }}
                  >
                    <div className="flex h-full items-center gap-3 px-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--fab-text-dim)]/35" />
                      <Skeleton
                        className={cn("h-4 rounded-full", row.labelWidth)}
                      />
                    </div>
                  </td>

                  {HEADER_SLOTS.map((slot, slotIndex) => {
                    const usage = row.slots.find(
                      (item) => item.start === slotIndex,
                    );

                    if (usage) {
                      return (
                        <td
                          key={`calendar-loading-slot-${rowIndex}-${slotIndex}`}
                          colSpan={usage.span}
                          style={{
                            padding: "3px 2px",
                            borderBottom: "1px solid var(--fab-border-soft)",
                            borderLeft: "1px solid var(--fab-border)",
                            height: 40,
                          }}
                        >
                          <Skeleton className="h-8 w-full rounded-md" />
                        </td>
                      );
                    }

                    const isCovered = row.slots.some(
                      (item) =>
                        slotIndex > item.start &&
                        slotIndex < item.start + item.span,
                    );

                    if (isCovered) return null;

                    const isBoundary =
                      slot >= HEADER_SLOTS[HEADER_SLOTS.length - 1];

                    return (
                      <td
                        key={`calendar-loading-empty-${rowIndex}-${slotIndex}`}
                        style={{
                          borderBottom: "1px solid var(--fab-border-soft)",
                          borderLeft: "1px solid var(--fab-border)",
                          background: isBoundary
                            ? "var(--fab-bg-sidebar)"
                            : "transparent",
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto md:hidden">
        {mobileLoadingRows.map((row, rowIndex) => (
          <div key={`calendar-mobile-loading-${rowIndex}`}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur-sm">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--fab-text-dim)]/35" />
                <Skeleton className={cn("h-4 rounded-full", row.headerWidth)} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>

            <div className="divide-y">
              {row.entries.map((entry, entryIndex) => (
                <div
                  key={`calendar-mobile-entry-${rowIndex}-${entryIndex}`}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <Skeleton className="h-8 w-1 shrink-0 rounded-full" />
                  <Skeleton
                    className={cn(
                      "h-4 max-w-full flex-1 rounded-full",
                      entry.titleWidth,
                    )}
                  />
                  <Skeleton
                    className={cn("h-4 shrink-0 rounded-full", entry.timeWidth)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RangeLoadingState({ viewMode }: { viewMode: "week" | "month" }) {
  if (viewMode === "week") {
    return (
      <div className="flex min-h-0 flex-1 overflow-auto">
        <div className="min-w-[1108px]">
          <div className="grid grid-cols-[72px_repeat(7,minmax(148px,1fr))] border-b bg-background">
            <div className="border-r bg-muted/10 px-3 py-2">
              <Skeleton className="h-3 w-8" />
            </div>

            {weekSkeletonDays.map((day) => (
              <div
                key={`calendar-week-loading-header-${day}`}
                className="border-r bg-muted/10 px-3 py-2 last:border-r-0"
              >
                <Skeleton className="h-3 w-10" />
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(148px,1fr))]">
            <div className="border-r bg-background">
              {weekHourSkeletons.map((hour) => (
                <div
                  key={`calendar-week-loading-time-${hour}`}
                  className="h-[52px] border-b border-border/60 px-3"
                >
                  <Skeleton className="h-3 w-10 -translate-y-1.5" />
                </div>
              ))}
            </div>

            {weekSkeletonDays.map((day) => (
              <div
                key={`calendar-week-loading-column-${day}`}
                className="relative h-[468px] border-r last:border-r-0"
              >
                {weekHourSkeletons.map((hour, index) => (
                  <div
                    key={`calendar-week-loading-line-${day}-${hour}`}
                    className="absolute left-0 right-0 border-t border-border/60"
                    style={{ top: `${index * 52}px` }}
                  />
                ))}

                <Skeleton className="absolute left-1 top-8 h-20 w-[calc(50%-6px)] rounded-lg" />
                <Skeleton className="absolute right-1 top-[136px] h-16 w-[calc(50%-6px)] rounded-lg" />
                <Skeleton className="absolute left-1 top-[240px] h-24 w-[calc(100%-8px)] rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-auto">
      <div className="grid min-h-0 min-w-[1008px] flex-1 grid-rows-[auto_1fr]">
        <div className="grid grid-cols-7 border-b bg-muted/10">
          {weekSkeletonDays.map((day) => (
            <div
              key={`calendar-month-loading-header-${day}`}
              className={cn("px-3 py-2", day === 0 ? "" : "border-l")}
            >
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        <div
          className="grid min-h-0 grid-cols-7 border-b border-r bg-background"
          style={{
            gridTemplateRows: `repeat(5, minmax(${CALENDAR_MONTH_CELL_MIN_HEIGHT}px, 1fr))`,
          }}
        >
          {monthSkeletonCells.map((cell) => (
            <div
              key={`calendar-month-loading-${cell}`}
              className="flex min-h-0 flex-col border-l border-t bg-background"
            >
              <div className="flex items-center justify-between gap-2 border-b bg-muted/10 px-3 py-2">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
                <Skeleton className="h-7 w-full rounded-md" />
                <Skeleton className="h-7 w-full rounded-md" />
                <div className="px-2">
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarContentLoadingState({
  viewMode = "day",
  activeTab = "services",
}: {
  viewMode?: CalendarViewMode;
  activeTab?: CalendarTab;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {viewMode === "day" ? (
        <DayLoadingState activeTab={activeTab} />
      ) : (
        <RangeLoadingState viewMode={viewMode} />
      )}
    </div>
  );
}

export function CalendarLoadingState({
  viewMode = "day",
  activeTab = "services",
  showStaffTabs = true,
}: {
  viewMode?: CalendarViewMode;
  activeTab?: CalendarTab;
  showStaffTabs?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <BookingCalendarToolbarSkeleton
        viewMode={viewMode}
        activeTab={activeTab}
        showStaffTabs={showStaffTabs}
      />
      <CalendarContentLoadingState viewMode={viewMode} activeTab={activeTab} />
    </div>
  );
}
