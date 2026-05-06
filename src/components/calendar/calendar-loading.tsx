"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { CalendarTab, CalendarViewMode } from "@/lib/calendar";
import {
  CALENDAR_DAY_LAYOUT_TEMPLATE,
  CALENDAR_DAY_LEADING_COL_WIDTH,
  CALENDAR_DAY_MIN_WIDTH,
  CALENDAR_DAY_ROW_HEIGHT,
  CALENDAR_DAY_SECTION_HEIGHT,
  CALENDAR_DAY_TIMELINE_TEMPLATE,
  CALENDAR_DAY_WORKSHOP_ROW_HEIGHT,
  CALENDAR_MONTH_CELL_MIN_HEIGHT,
  CALENDAR_MONTH_DAY_MIN_WIDTH,
  CALENDAR_WEEK_DAY_MIN_WIDTH,
  CALENDAR_WEEK_HOUR_ROW_MIN_HEIGHT,
  CALENDAR_WEEK_MIN_GRID_HEIGHT,
  CALENDAR_WEEK_MIN_TOTAL_HEIGHT,
  CALENDAR_WEEK_TIME_COL_WIDTH,
  DAY_END,
  DAY_START,
  HEADER_SLOTS,
} from "@/lib/calendar";
import { formatLabDecimalHour } from "@/lib/lab-time";
import { cn } from "@/lib/utils";
import { ViewHeader, ViewHeaderLeading } from "@/components/ui/view-header";

const DAY_SECTION_BG = "rgba(220,215,245,0.55)";
const DAY_SECTION_BG_STICKY = "rgba(220,215,245,0.9)";

const weekSkeletonDays = Array.from({ length: 7 }, (_, index) => index);
const monthSkeletonCells = Array.from({ length: 35 }, (_, index) => index);
const weekHourSkeletons = Array.from(
  { length: DAY_END - DAY_START },
  (_, index) => DAY_START + index,
);
const weekHalfHourMarks = Array.from(
  { length: (DAY_END - DAY_START) * 2 + 1 },
  (_, index) => index,
);

type DayLoadingRow =
  | {
      id: string;
      kind: "section";
      label: string;
      rowHeight: number;
    }
  | {
      id: string;
      kind: "track";
      labelWidth: string;
      rowHeight: number;
      showStatus?: boolean;
      slots: Array<
        | {
            start: number;
            span: number;
            kind: "standard";
          }
        | {
            start: number;
            span: number;
            kind: "workshop";
          }
      >;
    };

const SERVICE_DAY_LOADING_ROWS: DayLoadingRow[] = [
  {
    id: "fabrication-section",
    kind: "section",
    label: "Fabrication",
    rowHeight: CALENDAR_DAY_SECTION_HEIGHT,
  },
  {
    id: "fabrication-track-1",
    kind: "track",
    labelWidth: "w-28",
    rowHeight: CALENDAR_DAY_ROW_HEIGHT,
    showStatus: true,
    slots: [{ start: 1, span: 4, kind: "standard" }],
  },
  {
    id: "fabrication-track-2",
    kind: "track",
    labelWidth: "w-24",
    rowHeight: CALENDAR_DAY_ROW_HEIGHT,
    slots: [
      { start: 5, span: 3, kind: "standard" },
      { start: 10, span: 2, kind: "standard" },
    ],
  },
  {
    id: "workshop-section",
    kind: "section",
    label: "Workshops",
    rowHeight: CALENDAR_DAY_SECTION_HEIGHT,
  },
  {
    id: "workshop-track",
    kind: "track",
    labelWidth: "w-32",
    rowHeight: CALENDAR_DAY_WORKSHOP_ROW_HEIGHT,
    showStatus: true,
    slots: [{ start: 8, span: 5, kind: "workshop" }],
  },
];

const RESOURCE_DAY_LOADING_ROWS: DayLoadingRow[] = [
  {
    id: "machine-section",
    kind: "section",
    label: "Machines",
    rowHeight: CALENDAR_DAY_SECTION_HEIGHT,
  },
  {
    id: "machine-track-1",
    kind: "track",
    labelWidth: "w-28",
    rowHeight: CALENDAR_DAY_ROW_HEIGHT,
    showStatus: true,
    slots: [{ start: 1, span: 4, kind: "standard" }],
  },
  {
    id: "machine-track-2",
    kind: "track",
    labelWidth: "w-24",
    rowHeight: CALENDAR_DAY_ROW_HEIGHT,
    slots: [{ start: 8, span: 3, kind: "standard" }],
  },
  {
    id: "tool-section",
    kind: "section",
    label: "Tools",
    rowHeight: CALENDAR_DAY_SECTION_HEIGHT,
  },
  {
    id: "tool-track",
    kind: "track",
    labelWidth: "w-20",
    rowHeight: CALENDAR_DAY_ROW_HEIGHT,
    slots: [
      { start: 5, span: 2, kind: "standard" },
      { start: 12, span: 4, kind: "standard" },
    ],
  },
];

function formatLoadingTime(decimalHour: number) {
  return formatLabDecimalHour(decimalHour);
}

function getDayLoadingRows(activeTab: CalendarTab) {
  return activeTab === "resources"
    ? RESOURCE_DAY_LOADING_ROWS
    : SERVICE_DAY_LOADING_ROWS;
}

function getLoadingUsagePosition(start: number, span: number) {
  return {
    left: `${(start / HEADER_SLOTS.length) * 100}%`,
    width: `${(span / HEADER_SLOTS.length) * 100}%`,
  };
}

function StandardDayLoadingSlot({
  start,
  span,
}: {
  start: number;
  span: number;
}) {
  const position = getLoadingUsagePosition(start, span);

  return (
    <div
      className="absolute z-[5]"
      style={{
        top: 3,
        bottom: 3,
        left: `calc(${position.left} + 2px)`,
        width: `max(0px, calc(${position.width} - 4px))`,
      }}
    >
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  );
}

function WorkshopDayLoadingSlot({
  start,
  span,
}: {
  start: number;
  span: number;
}) {
  const position = getLoadingUsagePosition(start, span);

  return (
    <div
      className="absolute z-[5] overflow-hidden rounded-xl border border-blue-200/60 bg-blue-50/80 px-2.5 py-2 shadow-sm"
      style={{
        top: 4,
        bottom: 4,
        left: `calc(${position.left} + 2px)`,
        width: `max(0px, calc(${position.width} - 4px))`,
      }}
    >
      <div className="flex h-full flex-col gap-1.5 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        <div className="grid min-h-0 gap-1 overflow-hidden">
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

function DayLoadingState({ activeTab }: { activeTab: CalendarTab }) {
  const rows = getDayLoadingRows(activeTab);
  const bodyGridTemplateRows = rows
    .map((row) => `${row.rowHeight}px`)
    .join(" ");

  return (
    <>
      <div className="hidden min-h-0 flex-1 md:flex">
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div
            className="grid h-full min-h-full min-w-0 bg-background"
            style={{
              width: `max(100%, ${CALENDAR_DAY_MIN_WIDTH}px)`,
              gridTemplateRows: "auto 1fr",
              height: "100%",
            }}
          >
            <ViewHeader className="border-0 shadow-none">
              <div
                className="grid"
                style={{ gridTemplateColumns: CALENDAR_DAY_LAYOUT_TEMPLATE }}
              >
                <ViewHeaderLeading
                  width={CALENDAR_DAY_LEADING_COL_WIDTH}
                  className="h-11 border-b border-r px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {activeTab === "resources" ? "RESOURCES" : "SERVICES"}
                </ViewHeaderLeading>

                <div
                  className="relative grid"
                  style={{
                    gridTemplateColumns: CALENDAR_DAY_TIMELINE_TEMPLATE,
                    height: 44,
                  }}
                >
                  {HEADER_SLOTS.map((slot) => (
                    <div
                      key={`calendar-loading-header-${slot}`}
                      className="flex items-center whitespace-nowrap border-b border-l border-border px-1"
                      style={{
                        height: "100%",
                        color: "var(--fab-text-muted)",
                        fontSize: 10,
                        fontWeight: 500,
                        paddingLeft: 4,
                      }}
                    >
                      {slot % 1 === 0 ? formatLoadingTime(slot) : ""}
                    </div>
                  ))}
                </div>
              </div>
            </ViewHeader>

            <div
              className="grid min-h-0"
              style={{ gridTemplateRows: bodyGridTemplateRows }}
            >
              {rows.map((row) =>
                row.kind === "section" ? (
                  <div
                    key={row.id}
                    className="grid"
                    style={{
                      gridTemplateColumns: CALENDAR_DAY_LAYOUT_TEMPLATE,
                      height: "100%",
                    }}
                  >
                    <div
                      className="flex items-center px-3"
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 12,
                        background: DAY_SECTION_BG_STICKY,
                        borderTop: "1px solid var(--fab-border-md)",
                        borderBottom: "1px solid var(--fab-border-md)",
                        borderRight: "1px solid var(--fab-border-md)",
                      }}
                    >
                      <span
                        className="font-bold uppercase tracking-[0.1em]"
                        style={{
                          color: "var(--fab-text-dim)",
                          fontSize: 9,
                        }}
                      >
                        {row.label}
                      </span>
                    </div>

                    <div
                      className="relative grid"
                      style={{
                        gridTemplateColumns: CALENDAR_DAY_TIMELINE_TEMPLATE,
                        background: DAY_SECTION_BG,
                      }}
                    >
                      {HEADER_SLOTS.map((slot) => (
                        <div
                          key={`${row.id}-${slot}`}
                          aria-hidden
                          style={{
                            height: "100%",
                            borderTop: "1px solid var(--fab-border-md)",
                            borderBottom: "1px solid var(--fab-border-md)",
                            borderLeft: "1px solid var(--fab-border)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className="grid"
                    style={{
                      gridTemplateColumns: CALENDAR_DAY_LAYOUT_TEMPLATE,
                      minHeight: row.rowHeight,
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 8,
                        background: "var(--fab-bg-main)",
                        borderBottom: "1px solid var(--fab-border-md)",
                        borderRight: "1px solid var(--fab-border-md)",
                      }}
                    >
                      <div className="flex h-full items-center gap-2 px-3">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--fab-text-dim)]/35" />
                        <Skeleton
                          className={cn(
                            "h-4 flex-1 rounded-full",
                            row.labelWidth,
                          )}
                        />
                        {row.showStatus ? (
                          <Skeleton className="h-5 w-12 shrink-0 rounded-[3px]" />
                        ) : null}
                      </div>
                    </div>

                    <div
                      className="relative grid"
                      style={{
                        gridTemplateColumns: CALENDAR_DAY_TIMELINE_TEMPLATE,
                        minHeight: row.rowHeight,
                      }}
                    >
                      {HEADER_SLOTS.map((slot) => {
                        const isBoundary = slot >= DAY_END;

                        return (
                          <div
                            key={`${row.id}-${slot}`}
                            aria-hidden
                            style={{
                              height: "100%",
                              borderBottom: "1px solid var(--fab-border-soft)",
                              borderLeft: "1px solid var(--fab-border)",
                              background: isBoundary
                                ? "var(--fab-bg-sidebar)"
                                : "transparent",
                              pointerEvents: "none",
                            }}
                          />
                        );
                      })}

                      {row.slots.map((slot) =>
                        slot.kind === "workshop" ? (
                          <WorkshopDayLoadingSlot
                            key={`${row.id}-${slot.start}`}
                            start={slot.start}
                            span={slot.span}
                          />
                        ) : (
                          <StandardDayLoadingSlot
                            key={`${row.id}-${slot.start}`}
                            start={slot.start}
                            span={slot.span}
                          />
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto md:hidden">
        {rows
          .filter(
            (row): row is Extract<DayLoadingRow, { kind: "track" }> =>
              row.kind === "track",
          )
          .map((row, rowIndex) => (
            <div key={`calendar-mobile-loading-${row.id}-${rowIndex}`}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--fab-text-dim)]/35" />
                  <Skeleton
                    className={cn("h-4 rounded-full", row.labelWidth)}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  {row.showStatus ? (
                    <Skeleton className="h-5 w-20 rounded-full" />
                  ) : null}
                </div>
              </div>

              <div className="divide-y">
                {row.slots.map((slot, slotIndex) => (
                  <div
                    key={`calendar-mobile-entry-${row.id}-${slot.start}-${slotIndex}`}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <Skeleton className="h-8 w-1 shrink-0 rounded-full" />
                    <Skeleton className="h-4 max-w-full flex-1 rounded-full" />
                    <Skeleton className="h-4 w-20 shrink-0 rounded-full" />
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
  const weekMinWidth =
    CALENDAR_WEEK_TIME_COL_WIDTH +
    weekSkeletonDays.length * CALENDAR_WEEK_DAY_MIN_WIDTH;
  const monthMinWidth = weekSkeletonDays.length * CALENDAR_MONTH_DAY_MIN_WIDTH;

  if (viewMode === "week") {
    return (
      <div className="flex min-h-0 flex-1 overflow-auto">
        <div
          className="grid h-full min-h-full min-w-0 flex-1"
          style={{
            width: `max(100%, ${weekMinWidth}px)`,
            minHeight: CALENDAR_WEEK_MIN_TOTAL_HEIGHT,
            gridTemplateRows: `auto minmax(${CALENDAR_WEEK_MIN_GRID_HEIGHT}px, 1fr)`,
          }}
        >
          <ViewHeader className="border-0 shadow-none">
            <div
              className="grid border-b"
              style={{
                gridTemplateColumns: `${CALENDAR_WEEK_TIME_COL_WIDTH}px repeat(${weekSkeletonDays.length}, minmax(${CALENDAR_WEEK_DAY_MIN_WIDTH}px, 1fr))`,
              }}
            >
              <ViewHeaderLeading
                width={CALENDAR_WEEK_TIME_COL_WIDTH}
                className="border-r px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Time
              </ViewHeaderLeading>

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
          </ViewHeader>

          <div
            className="grid h-full min-h-0"
            style={{
              gridTemplateColumns: `${CALENDAR_WEEK_TIME_COL_WIDTH}px repeat(${weekSkeletonDays.length}, minmax(${CALENDAR_WEEK_DAY_MIN_WIDTH}px, 1fr))`,
            }}
          >
            <div
              className="grid border-r bg-background"
              style={{
                gridTemplateRows: `repeat(${weekHourSkeletons.length}, minmax(${CALENDAR_WEEK_HOUR_ROW_MIN_HEIGHT}px, 1fr))`,
              }}
            >
              {weekHourSkeletons.map((hour) => (
                <div
                  key={`calendar-week-loading-time-${hour}`}
                  className="border-b border-border/60 px-3"
                >
                  <Skeleton className="h-3 w-10 -translate-y-1.5" />
                </div>
              ))}
            </div>

            {weekSkeletonDays.map((day) => (
              <div
                key={`calendar-week-loading-column-${day}`}
                className="relative border-r last:border-r-0"
                style={{ minHeight: CALENDAR_WEEK_MIN_GRID_HEIGHT }}
              >
                {weekHalfHourMarks.map((mark, index) => (
                  <div
                    key={`calendar-week-loading-line-${day}-${mark}`}
                    className={cn(
                      "absolute left-0 right-0",
                      index % 2 === 0
                        ? "border-t border-border/60"
                        : "border-t border-dashed border-border/40",
                    )}
                    style={{
                      top: `${(mark / Math.max(weekHalfHourMarks.length - 1, 1)) * 100}%`,
                    }}
                  />
                ))}

                <Skeleton className="absolute left-1 top-[8%] h-20 w-[calc(50%-6px)] rounded-lg" />
                <Skeleton className="absolute right-1 top-[28%] h-16 w-[calc(50%-6px)] rounded-lg" />
                <Skeleton className="absolute left-1 top-[50%] h-24 w-[calc(100%-8px)] rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-auto">
      <div
        className="grid h-full min-h-0 min-w-0 flex-1"
        style={{
          width: `max(100%, ${monthMinWidth}px)`,
          gridTemplateRows: "auto minmax(0, 1fr)",
        }}
      >
        <ViewHeader className="border-0 shadow-none">
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: `repeat(7, minmax(${CALENDAR_MONTH_DAY_MIN_WIDTH}px, 1fr))`,
            }}
          >
            {weekSkeletonDays.map((day) => (
              <div
                key={`calendar-month-loading-header-${day}`}
                className={cn(
                  "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                  day === 0 ? "" : "border-l",
                )}
              >
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </ViewHeader>

        <div
          className="grid min-h-0 border-b border-r bg-background"
          style={{
            gridTemplateColumns: `repeat(7, minmax(${CALENDAR_MONTH_DAY_MIN_WIDTH}px, 1fr))`,
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
      <CalendarContentLoadingState viewMode={viewMode} activeTab={activeTab} />
    </div>
  );
}
