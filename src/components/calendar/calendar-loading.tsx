"use client";

import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  HEADER_SLOTS,
  RESOURCES_COL_WIDTH,
  SLOT_WIDTH,
} from "@/components/calendar/usage-table";

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

const LOADING_TABLE_WIDTH =
  RESOURCES_COL_WIDTH + HEADER_SLOTS.length * SLOT_WIDTH;

function formatLoadingTime(decimalHour: number) {
  const hours = Math.floor(decimalHour);
  const minutes = (decimalHour % 1) * 60;

  return format(
    setMinutes(setHours(startOfDay(new Date()), hours), minutes),
    minutes === 0 ? "ha" : "h:mm",
  );
}

export function CalendarLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        <Skeleton className="h-8 w-16 rounded-md" />

        <div className="h-4 w-px bg-border" />

        <Skeleton className="h-8 w-40 rounded-md" />

        <div className="h-4 w-px bg-border" />

        <div className="inline-flex h-8 items-center rounded-md border bg-background p-0.5">
          <div className="flex h-7 items-center rounded-sm bg-muted px-3 text-xs font-medium text-foreground">
            Service Bookings
          </div>
          <div className="flex h-7 items-center rounded-sm px-3 text-xs text-muted-foreground">
            Machine Schedule
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="h-4 w-16" />
          <div className="h-3 w-px bg-border" />
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

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
              <col style={{ width: RESOURCES_COL_WIDTH }} />
              {HEADER_SLOTS.map((slot) => (
                <col key={`calendar-loading-col-${slot}`} style={{ width: SLOT_WIDTH }} />
              ))}
            </colgroup>
            <thead>
              <tr
                style={{
                  height: 44,
                  background: "var(--fab-bg-sidebar)",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                }}
              >
                <th
                  style={{
                    width: RESOURCES_COL_WIDTH,
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
                  SERVICES
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
                      <div className="h-2 w-2 rounded-full bg-[var(--fab-text-dim)]/35 shrink-0" />
                      <Skeleton className={cn("h-4 rounded-full", row.labelWidth)} />
                    </div>
                  </td>

                  {HEADER_SLOTS.map((slot, slotIndex) => {
                    const usage = row.slots.find((item) => item.start === slotIndex);

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
                        slotIndex > item.start && slotIndex < item.start + item.span,
                    );

                    if (isCovered) return null;

                    const isBoundary = slot >= HEADER_SLOTS[HEADER_SLOTS.length - 1];

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
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-full bg-[var(--fab-text-dim)]/35 shrink-0" />
                <Skeleton className={cn("h-4 rounded-full", row.headerWidth)} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                  <Skeleton className="h-8 w-1 rounded-full shrink-0" />
                  <Skeleton
                    className={cn("h-4 flex-1 max-w-full rounded-full", entry.titleWidth)}
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
    </div>
  );
}
