"use client";

import * as React from "react";
import Link from "next/link";
import { PROJECT_STATUS_LABELS } from "@convex/constants";
import type { Id } from "@convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  buildCalendarDayScheduleRows,
  CALENDAR_DAY_HEADER_HEIGHT,
  CALENDAR_DAY_LAYOUT_TEMPLATE,
  CALENDAR_DAY_MIN_WIDTH,
  CALENDAR_DAY_TIMELINE_TEMPLATE,
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
  onOpenProjectDetails,
}: {
  usage: MachineUsage;
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
        "flex w-full items-center gap-2 overflow-hidden rounded-md border px-2 py-1 text-left shadow-sm transition-colors disabled:cursor-default",
        usage.slotClassName,
        usage.isPendingReview && "border-2 border-dashed",
        canOpenProjectDetails &&
          "cursor-pointer hover:ring-2 hover:ring-primary/20",
      )}
    >
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", usage.accentClassName)}
      />
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight">
        {usage.clientName}
      </span>
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {PROJECT_STATUS_LABELS[usage.projectStatus]}
      </span>
    </button>
  );
}

function WorkshopSlotCard({
  entry,
  position,
  onOpenProjectDetails,
}: {
  entry: Extract<CalendarDayTrackEntry, { kind: "workshop" }>;
  position: { left: string; width: string };
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
}) {
  const visibleMembers = entry.members.slice(0, 4);
  const hiddenMemberCount = entry.members.length - visibleMembers.length;

  return (
    <div
      className="absolute z-[5] overflow-hidden rounded-xl border border-blue-200 bg-blue-50/95 text-left shadow-sm"
      style={{
        top: 4,
        bottom: 4,
        left: `calc(${position.left} + 2px)`,
        width: `max(0px, calc(${position.width} - 4px))`,
      }}
    >
      <div className="flex h-full flex-col gap-1.5 overflow-hidden px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-blue-900">
              Workshop Slot
            </div>
            <div className="truncate text-[10px] text-blue-800/80">
              {entry.bookingCount} booked
              {entry.pendingCount > 0 ? ` · ${entry.pendingCount} pending` : ""}
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-blue-900 shadow-sm">
            {formatShortTime(entry.startTime)}-{formatShortTime(entry.endTime)}
          </div>
        </div>

        <div className="grid min-h-0 gap-1 overflow-hidden">
          {visibleMembers.map((member) => (
            <WorkshopMemberChip
              key={member.id}
              usage={member}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          ))}
          {hiddenMemberCount > 0 ? (
            <div className="px-1 text-[10px] font-medium text-blue-900/75">
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
  onOpenProjectDetails,
}: {
  usage: MachineUsage;
  position: { left: string; width: string };
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
        top: 3,
        bottom: 3,
        left: `calc(${position.left} + 2px)`,
        width: `max(0px, calc(${position.width} - 4px))`,
      }}
    >
      <div
        className={cn(
          "flex h-full items-center justify-center overflow-hidden rounded-md border px-2 py-1 shadow-sm",
          usage.slotClassName,
          usage.isPendingReview && "border-2 border-dashed opacity-80",
          canOpenProjectDetails && "hover:ring-2 hover:ring-primary/20",
        )}
      >
        <span
          className="w-full truncate text-center font-semibold leading-tight"
          style={{ fontSize: 12 }}
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
}: {
  left: string;
  showArrow?: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left,
        top: 0,
        bottom: 0,
        width: 2,
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
            left: -4,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "7px solid var(--fab-magenta)",
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
  const bodyGridTemplateRows =
    scheduleRows.length > 0
      ? scheduleRows.map((row) => `${row.rowHeight}px`).join(" ")
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
              width: `max(100%, ${CALENDAR_DAY_MIN_WIDTH}px)`,
              gridTemplateRows: `auto 1fr`,
              height: "100%",
            }}
          >
            <div
              className="sticky top-0 z-20 grid"
              style={{
                gridTemplateColumns: CALENDAR_DAY_LAYOUT_TEMPLATE,
                background: "var(--fab-bg-sidebar)",
              }}
            >
              <div
                className="flex items-center"
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 30,
                  height: CALENDAR_DAY_HEADER_HEIGHT,
                  background: "var(--fab-bg-sidebar)",
                  borderBottom: "1px solid var(--fab-border-md)",
                  borderRight: "1px solid var(--fab-border-md)",
                  paddingLeft: 12,
                  color: "var(--fab-text-muted)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {leadingColumnLabel}
              </div>

              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: CALENDAR_DAY_TIMELINE_TEMPLATE,
                  height: CALENDAR_DAY_HEADER_HEIGHT,
                  background: "var(--fab-bg-sidebar)",
                }}
              >
                {HEADER_SLOTS.map((slot, slotIndex) => {
                  const isCurrentHeader =
                    currentSlotIdx !== null && slotIndex === currentSlotIdx;

                  return (
                    <div
                      key={`header-slot-${slot}`}
                      className="flex items-center whitespace-nowrap px-1"
                      style={{
                        height: "100%",
                        borderBottom: "1px solid var(--fab-border-md)",
                        borderLeft: "1px solid var(--fab-border)",
                        background: isCurrentHeader
                          ? "rgba(157,26,88,0.06)"
                          : "var(--fab-bg-sidebar)",
                        color: isCurrentHeader
                          ? "var(--fab-magenta)"
                          : "var(--fab-text-muted)",
                        fontSize: 10,
                        fontWeight: isCurrentHeader ? 700 : 500,
                        paddingLeft: 4,
                      }}
                    >
                      {slot % 1 === 0 ? formatShortTime(slot) : ""}
                    </div>
                  );
                })}
                {nowIndicatorLeft ? (
                  <DayNowIndicator left={nowIndicatorLeft} showArrow />
                ) : null}
              </div>
            </div>

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
                        gridTemplateColumns: CALENDAR_DAY_LAYOUT_TEMPLATE,
                        height: "100%",
                      }}
                    >
                      {/* ✅ LEFT STICKY COLUMN (FIXED) */}
                      <div
                        className="flex items-center px-3"
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
                            fontSize: 9,
                          }}
                        >
                          {row.label}
                        </span>
                      </div>

                      {/* TIMELINE */}
                      <div
                        className="relative grid"
                        style={{
                          gridTemplateColumns: CALENDAR_DAY_TIMELINE_TEMPLATE,
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
                      {row.isFirstTrack ? (
                        <div className="flex h-full items-center gap-2 px-3">
                          <div
                            aria-hidden
                            style={{
                              width: 6,
                              height: 6,
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
                            style={{ fontSize: 11.5 }}
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
                              className="rounded-[3px] px-1.5 text-[9px] font-bold uppercase tracking-[0.04em]"
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
                        gridTemplateColumns: CALENDAR_DAY_TIMELINE_TEMPLATE,
                        minHeight: row.rowHeight,
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
                        <DayNowIndicator left={nowIndicatorLeft} />
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
                            onOpenProjectDetails={onOpenProjectDetails}
                          />
                        ) : (
                          <StandardUsageCard
                            key={entry.id}
                            usage={entry.usage}
                            position={position}
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
