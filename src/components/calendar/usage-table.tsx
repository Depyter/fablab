"use client";

import * as React from "react";
import Link from "next/link";
import { PROJECT_STATUS_LABELS } from "@convex/constants";
import type { Id } from "@convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ViewHeader, ViewHeaderLeading } from "@/components/ui/view-header";
import {
  buildCalendarDayScheduleRows,
  CALENDAR_DAY_HEADER_HEIGHT,
  CALENDAR_DAY_ROW_HEIGHT,
  CALENDAR_DAY_SECTION_HEIGHT,
  CALENDAR_DAY_LEADING_COL_WIDTH,
  CALENDAR_DAY_SLOT_WIDTH,
  CALENDAR_DAY_WORKSHOP_ROW_HEIGHT,
  getCalendarDayNowIndicatorLeft,
  getCalendarDayUsagePosition,
  isWorkshopTrackEntry,
  type CalendarDayTrackEntry,
  type CalendarMachine as Machine,
  DAY_END,
  DAY_START,
  HEADER_SLOTS,
  type CalendarMachineUsage as MachineUsage,
} from "@/lib/calendar";
import {
  formatLabDecimalHour,
  getCurrentTimestamp,
  getLabDecimalHour,
} from "@/lib/lab-time";
import { cn } from "@/lib/utils";

const SECTION_BG = "rgba(220,215,245,0.55)";
const SECTION_BG_STICKY = "rgba(220,215,245,0.9)";

interface UsageTableProps {
  machines: Machine[];
  usages: MachineUsage[];
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
  leadingColumnLabel?: string;
}

function formatShortTime(decimalHour: number) {
  return formatLabDecimalHour(decimalHour);
}

function renderMachineStatusColor(status: "active" | "maintenance" | "free") {
  if (status === "active") return "var(--fab-teal)";
  if (status === "maintenance") return "var(--fab-amber)";
  return "var(--fab-text-dim)";
}

function WorkshopMemberChip({
  usage,
  compact = false,
  onOpenProjectDetails,
}: {
  usage: MachineUsage;
  compact?: boolean;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}) {
  const canOpenProjectDetails =
    usage.projectId !== null && onOpenProjectDetails !== undefined;

  return (
    <button
      type="button"
      disabled={!canOpenProjectDetails}
      onClick={() => usage.projectId && onOpenProjectDetails?.(usage.projectId)}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-md border text-left shadow-sm transition-colors disabled:cursor-default",
        compact ? "px-1.5 py-0.5" : "px-2 py-1",
        usage.slotClassName,
        usage.isPendingReview && "border-2 border-dashed",
        canOpenProjectDetails &&
          "cursor-pointer hover:ring-2 hover:ring-primary/20",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-full",
          compact ? "h-1.5 w-1.5" : "h-2 w-2",
          usage.accentClassName,
        )}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-semibold leading-tight",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {usage.clientName}
      </span>
      <span
        className={cn(
          "shrink-0 font-bold uppercase tracking-[0.06em] text-muted-foreground",
          compact ? "text-[8px]" : "text-[9px]",
        )}
      >
        {PROJECT_STATUS_LABELS[usage.projectStatus]}
      </span>
    </button>
  );
}

function WorkshopSlotCard({
  entry,
  position,
  compact = false,
  onOpenProjectDetails,
}: {
  entry: Extract<CalendarDayTrackEntry, { kind: "workshop" }>;
  position: { left: string; width: string };
  compact?: boolean;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}) {
  const visibleMembers = entry.members.slice(0, compact ? 2 : 4);
  const hiddenMemberCount = entry.members.length - visibleMembers.length;

  return (
    <div
      className="absolute z-[5] overflow-hidden rounded-xl border border-blue-200 bg-blue-50/95 text-left shadow-sm"
      style={{
        top: compact ? 2 : 4,
        bottom: compact ? 2 : 4,
        left: `calc(${position.left} + 2px)`,
        width: `max(0px, calc(${position.width} - 4px))`,
      }}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden",
          compact ? "gap-1 px-1.5 py-1" : "gap-1.5 px-2.5 py-2",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-bold uppercase tracking-[0.08em] text-blue-900",
                compact ? "text-[10px]" : "text-[11px]",
              )}
            >
              Workshop Slot
            </div>
            <div
              className={cn(
                "truncate text-blue-800/80",
                compact ? "text-[9px]" : "text-[10px]",
              )}
            >
              {entry.bookingCount} booked
              {entry.pendingCount > 0 ? ` · ${entry.pendingCount} pending` : ""}
            </div>
          </div>
          <div
            className={cn(
              "shrink-0 rounded-full bg-white/80 font-semibold text-blue-900 shadow-sm",
              compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
            )}
          >
            {formatShortTime(entry.startTime)}-{formatShortTime(entry.endTime)}
          </div>
        </div>

        <div className="grid min-h-0 gap-1 overflow-hidden">
          {visibleMembers.map((member) => (
            <WorkshopMemberChip
              key={member.id}
              usage={member}
              compact={compact}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          ))}
          {hiddenMemberCount > 0 ? (
            <div
              className={cn(
                "px-1 font-medium text-blue-900/75",
                compact ? "text-[9px]" : "text-[10px]",
              )}
            >
              +{hiddenMemberCount} more booked
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StandardUsageCard({
  usage,
  position,
  compact = false,
  onOpenProjectDetails,
}: {
  usage: MachineUsage;
  position: { left: string; width: string };
  compact?: boolean;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}) {
  const canOpenProjectDetails =
    usage.projectId !== null && onOpenProjectDetails !== undefined;

  return (
    <button
      type="button"
      disabled={!canOpenProjectDetails}
      onClick={() => usage.projectId && onOpenProjectDetails?.(usage.projectId)}
      className={cn(
        "absolute z-[5] text-left disabled:cursor-default",
        canOpenProjectDetails &&
          "cursor-pointer transition-shadow hover:shadow-sm",
      )}
      style={{
        top: compact ? 2 : 3,
        bottom: compact ? 2 : 3,
        left: `calc(${position.left} + 2px)`,
        width: `max(0px, calc(${position.width} - 4px))`,
      }}
    >
      <div
        className={cn(
          "flex h-full items-center justify-center overflow-hidden rounded-md border shadow-sm",
          compact ? "px-1 py-0.5" : "px-2 py-1",
          usage.slotClassName,
          usage.isPendingReview && "border-2 border-dashed opacity-80",
          canOpenProjectDetails && "hover:ring-2 hover:ring-primary/20",
        )}
      >
        <span
          className="w-full truncate text-center font-semibold leading-tight"
          style={{ fontSize: compact ? 10 : 12 }}
        >
          {usage.projectAlias}
        </span>
      </div>
    </button>
  );
}

function DayNowIndicator({
  left,
  showArrow = false,
  compact = false,
}: {
  left: string;
  showArrow?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left,
        top: 0,
        bottom: 0,
        width: compact ? 1 : 2,
        background: "var(--fab-magenta)",
        zIndex: 6,
        pointerEvents: "none",
      }}
    >
      {showArrow ? (
        <div
          style={{
            position: "absolute",
            top: -1,
            left: compact ? -3 : -4,
            width: 0,
            height: 0,
            borderLeft: `${compact ? 4 : 5}px solid transparent`,
            borderRight: `${compact ? 4 : 5}px solid transparent`,
            borderTop: `${compact ? 6 : 7}px solid var(--fab-magenta)`,
          }}
        />
      ) : null}
    </div>
  );
}

export function UsageTable({
  machines,
  usages,
  onOpenProjectDetails,
  leadingColumnLabel = "RESOURCES",
}: UsageTableProps) {
  const isMobile = useIsMobile();
  const [nowTime, setNowTime] = React.useState<number>(() =>
    getCurrentTimestamp(),
  );
  const nowDecimal = getLabDecimalHour(nowTime);

  React.useEffect(() => {
    const tick = setInterval(() => setNowTime(getCurrentTimestamp()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const scheduleRows = buildCalendarDayScheduleRows({
    machines,
    usages,
    nowDecimal,
  });
  const dayLeadingColWidth = isMobile ? 96 : CALENDAR_DAY_LEADING_COL_WIDTH;
  const daySlotWidth = isMobile ? 24 : CALENDAR_DAY_SLOT_WIDTH;
  const dayHeaderHeight = isMobile ? 34 : CALENDAR_DAY_HEADER_HEIGHT;
  const dayTimelineMinWidth = HEADER_SLOTS.length * daySlotWidth;
  const dayMinWidth = dayLeadingColWidth + dayTimelineMinWidth;
  const dayTimelineTemplate = `repeat(${HEADER_SLOTS.length}, minmax(${daySlotWidth}px, 1fr))`;
  const dayLayoutTemplate = `minmax(${dayLeadingColWidth}px, ${isMobile ? 2.2 : 3}fr) minmax(${dayTimelineMinWidth}px, ${HEADER_SLOTS.length}fr)`;
  const getResponsiveRowHeight = (rowHeight: number) => {
    if (!isMobile) return rowHeight;
    if (rowHeight === CALENDAR_DAY_WORKSHOP_ROW_HEIGHT) return 80;
    if (rowHeight === CALENDAR_DAY_ROW_HEIGHT) return 32;
    if (rowHeight === CALENDAR_DAY_SECTION_HEIGHT) return 22;
    return rowHeight;
  };
  const bodyGridTemplateRows =
    scheduleRows.length > 0
      ? scheduleRows.map((row) => `${getResponsiveRowHeight(row.rowHeight)}px`).join(" ")
      : undefined;

  const nowInRange = nowDecimal >= DAY_START && nowDecimal < DAY_END;
  const currentSlotIdx = nowInRange
    ? Math.floor((nowDecimal - DAY_START) * 2)
    : null;
  const nowIndicatorLeft = nowInRange
    ? getCalendarDayNowIndicatorLeft(nowDecimal)
    : null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1">
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div
            className="grid h-full min-h-full min-w-0 bg-background"
            style={{
              width: `max(100%, ${dayMinWidth}px)`,
              gridTemplateRows: `auto 1fr`,
              height: "100%",
            }}
          >
            <ViewHeader className="border-0 shadow-none">
              <div
                className="grid"
                style={{ gridTemplateColumns: dayLayoutTemplate }}
              >
                <ViewHeaderLeading
                  width={dayLeadingColWidth}
                  className={cn(
                    "border-b border-r font-bold uppercase tracking-[0.1em] text-muted-foreground",
                    isMobile ? "h-[34px] px-2 text-[9px]" : "h-11 px-3 text-[10px]",
                  )}
                >
                  {leadingColumnLabel}
                </ViewHeaderLeading>

                <div
                  className="relative grid"
                  style={{
                    gridTemplateColumns: dayTimelineTemplate,
                    height: dayHeaderHeight,
                  }}
                >
                  {HEADER_SLOTS.map((slot, slotIndex) => {
                    const isCurrentHeader =
                      currentSlotIdx !== null && slotIndex === currentSlotIdx;

                    return (
                      <div
                        key={`header-slot-${slot}`}
                        className="flex items-center whitespace-nowrap border-b border-l border-border px-1"
                        style={{
                          height: "100%",
                          background: isCurrentHeader
                            ? "rgba(157,26,88,0.06)"
                            : "transparent",
                          color: isCurrentHeader
                            ? "var(--fab-magenta)"
                            : "var(--fab-text-muted)",
                          fontSize: isMobile ? 9 : 10,
                          fontWeight: isCurrentHeader ? 700 : 500,
                          paddingLeft: isMobile ? 2 : 4,
                        }}
                      >
                        {slot % 1 === 0 ? formatShortTime(slot) : ""}
                      </div>
                    );
                  })}
                  {nowIndicatorLeft ? (
                    <DayNowIndicator
                      left={nowIndicatorLeft}
                      showArrow
                      compact={isMobile}
                    />
                  ) : null}
                </div>
              </div>
            </ViewHeader>

            <div
              className="grid min-h-0"
              style={{ gridTemplateRows: bodyGridTemplateRows }}
            >
              {scheduleRows.map((row) => {
                if (row.kind === "section") {
                  return (
                    <div
                        key={row.id}
                        className="grid"
                        style={{
                          gridTemplateColumns: dayLayoutTemplate,
                          height: "100%",
                        }}
                    >
                      {/* ✅ LEFT STICKY COLUMN (FIXED) */}
                      <div
                        className={cn(
                          "flex items-center",
                          isMobile ? "px-2" : "px-3",
                        )}
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 12,
                          background: SECTION_BG_STICKY,
                          borderTop: "1px solid var(--fab-border-md)",
                          borderBottom: "1px solid var(--fab-border-md)",
                          borderRight: "1px solid var(--fab-border-md)",
                        }}
                      >
                        <span
                          className="font-bold uppercase tracking-[0.1em]"
                          style={{
                            color: "var(--fab-text-dim)",
                            fontSize: isMobile ? 8 : 9,
                          }}
                        >
                          {row.label}
                        </span>
                      </div>

                      {/* TIMELINE */}
                      <div
                        className="relative grid"
                        style={{
                          gridTemplateColumns: dayTimelineTemplate,
                          background: SECTION_BG,
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

                        {nowIndicatorLeft ? (
                          <DayNowIndicator left={nowIndicatorLeft} />
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                        key={row.id}
                        className="grid"
                        style={{
                          gridTemplateColumns: dayLayoutTemplate,
                          minHeight: getResponsiveRowHeight(row.rowHeight),
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
                      {row.isFirstTrack ? (
                          <div
                            className={cn(
                              "flex h-full items-center gap-2",
                              isMobile ? "px-2" : "px-3",
                            )}
                          >
                            <div
                              aria-hidden
                              style={{
                                width: isMobile ? 5 : 6,
                                height: isMobile ? 5 : 6,
                                borderRadius: "50%",
                                flexShrink: 0,
                              background: renderMachineStatusColor(
                                row.machineStatus,
                              ),
                              animation:
                                row.machineStatus === "active"
                                  ? "dotPulse 2.2s ease infinite"
                                  : "none",
                            }}
                          />

                          <span
                              className="min-w-0 flex-1 truncate text-[var(--fab-text-primary)]"
                              style={{ fontSize: isMobile ? 10.5 : 11.5 }}
                            >
                            {row.machine.href ? (
                              <Link
                                href={row.machine.href}
                                className="truncate underline-offset-4 hover:underline"
                              >
                                {row.machine.name}
                              </Link>
                            ) : (
                              row.machine.name
                            )}
                          </span>

                          {row.machineStatus !== "free" ? (
                            <Badge
                              variant={
                                row.machineStatus === "active"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={cn(
                                "rounded-[3px] px-1.5 font-bold uppercase tracking-[0.04em]",
                                isMobile ? "text-[8px]" : "text-[9px]",
                              )}
                            >
                              {row.machineStatus === "active" ? "On" : "Maint"}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className="relative grid"
                      style={{
                        gridTemplateColumns: dayTimelineTemplate,
                        minHeight: getResponsiveRowHeight(row.rowHeight),
                      }}
                    >
                      {HEADER_SLOTS.map((slot, slotIndex) => {
                        const isBoundary = slot >= DAY_END;
                        const isHighlightedSlot =
                          currentSlotIdx !== null &&
                          slotIndex === currentSlotIdx;

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
                                : isHighlightedSlot
                                  ? "rgba(181,32,79,0.03)"
                                  : "transparent",
                              pointerEvents: "none",
                            }}
                          />
                        );
                      })}

                      {nowIndicatorLeft ? (
                        <DayNowIndicator left={nowIndicatorLeft} compact={isMobile} />
                      ) : null}

                      {row.entries.map((entry) => {
                        const position = getCalendarDayUsagePosition(
                          entry.startTime,
                          entry.endTime,
                        );

                        return isWorkshopTrackEntry(entry) ? (
                          <WorkshopSlotCard
                            key={entry.id}
                            entry={entry}
                            position={position}
                            compact={isMobile}
                            onOpenProjectDetails={onOpenProjectDetails}
                          />
                        ) : (
                          <StandardUsageCard
                            key={entry.id}
                            usage={entry.usage}
                            position={position}
                            compact={isMobile}
                            onOpenProjectDetails={onOpenProjectDetails}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
