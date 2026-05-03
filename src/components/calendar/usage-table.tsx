"use client";

import * as React from "react";
import Link from "next/link";
import { ResourceStatus, type ProjectStatusType } from "@convex/constants";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import type { Id } from "@convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DAY_END,
  DAY_START,
  getCalendarSlotIndex,
  HEADER_SLOTS,
  TOTAL_SLOTS,
} from "@/lib/calendar";
import { getLabDecimalHour } from "@/lib/lab-time";
import { cn } from "@/lib/utils";

export const ROW_HEIGHT = 40;
export const SECTION_HEIGHT = 26;
export const HEADER_HEIGHT = 44;
export const RESOURCES_COL_WIDTH = 160;
export const SLOT_WIDTH = 52;

const DAY_TIMELINE_MIN_WIDTH = HEADER_SLOTS.length * SLOT_WIDTH;
const DAY_MIN_WIDTH = RESOURCES_COL_WIDTH + DAY_TIMELINE_MIN_WIDTH;
const DAY_LAYOUT_TEMPLATE = `minmax(${RESOURCES_COL_WIDTH}px, 3fr) minmax(${DAY_TIMELINE_MIN_WIDTH}px, ${HEADER_SLOTS.length}fr)`;
const DAY_TIMELINE_TEMPLATE = `repeat(${HEADER_SLOTS.length}, minmax(${SLOT_WIDTH}px, 1fr))`;
const SECTION_BG = "rgba(220,215,245,0.55)";
const SECTION_BG_STICKY = "rgba(220,215,245,0.9)";

type MachineStatus = "active" | "maintenance" | "free";

export interface Machine {
  id: string;
  name: string;
  status: typeof ResourceStatus.AVAILABLE | typeof ResourceStatus.UNAVAILABLE;
  description: string;
  group?: string;
  href?: string;
}

export interface MachineUsage {
  id: string;
  machineId: string;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: ProjectStatusType;
  makerName: string;
  date: number;
  startTime: number;
  endTime: number;
  color?: string;
}

interface UsageTableProps {
  machines: Machine[];
  usages: MachineUsage[];
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
  leadingColumnLabel?: string;
}

type ScheduleRow =
  | {
      id: string;
      kind: "section";
      label: string;
    }
  | {
      id: string;
      kind: "track";
      machine: Machine;
      machineStatus: MachineStatus;
      track: MachineUsage[];
      isFirstTrack: boolean;
    };

function getMachineStatus(
  machine: Machine,
  machineUsages: MachineUsage[],
  nowDecimal: number,
): MachineStatus {
  if (machine.status === ResourceStatus.UNAVAILABLE) return "maintenance";

  const active = machineUsages.find(
    (usage) => usage.startTime <= nowDecimal && usage.endTime > nowDecimal,
  );

  return active ? "active" : "free";
}

function formatShortTime(decimalHour: number) {
  const hours = Math.floor(decimalHour);
  const minutes = (decimalHour % 1) * 60;

  return format(
    setMinutes(setHours(startOfDay(new Date()), hours), minutes),
    minutes === 0 ? "ha" : "h:mm",
  );
}

function getSlotIndex(decimalHour: number) {
  return getCalendarSlotIndex(decimalHour);
}

function computeTracks(usages: MachineUsage[]): MachineUsage[][] {
  const sorted = [...usages].sort((a, b) => a.startTime - b.startTime);
  const tracks: MachineUsage[][] = [];

  for (const usage of sorted) {
    let placed = false;

    for (const track of tracks) {
      const lastUsage = track[track.length - 1];

      if (usage.startTime >= lastUsage.endTime) {
        track.push(usage);
        placed = true;
        break;
      }
    }

    if (!placed) {
      tracks.push([usage]);
    }
  }

  return tracks.length > 0 ? tracks : [[]];
}

function getUsagePosition(startTime: number, endTime: number) {
  const startIndex = Math.max(getSlotIndex(startTime), 0);
  const slotSpan = Math.max(
    1,
    Math.min(Math.round((endTime - startTime) * 2), TOTAL_SLOTS - startIndex),
  );

  return {
    left: `${(startIndex / HEADER_SLOTS.length) * 100}%`,
    width: `${(slotSpan / HEADER_SLOTS.length) * 100}%`,
  };
}

function getNowIndicatorLeft(nowDecimal: number) {
  return `${(((nowDecimal - DAY_START) * 2) / HEADER_SLOTS.length) * 100}%`;
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

export const UsageTable = React.memo(function UsageTable({
  machines,
  usages,
  onOpenProjectDetails,
  leadingColumnLabel = "RESOURCES",
}: UsageTableProps) {
  const [nowDate, setNowDate] = React.useState<Date>(() => new Date());
  const nowDecimal = getLabDecimalHour(nowDate);

  React.useEffect(() => {
    const tick = setInterval(() => setNowDate(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const usagesByMachine = React.useMemo(() => {
    const grouped = new Map<string, MachineUsage[]>();

    for (const usage of usages) {
      const machineUsages = grouped.get(usage.machineId);

      if (machineUsages) {
        machineUsages.push(usage);
      } else {
        grouped.set(usage.machineId, [usage]);
      }
    }

    for (const machineUsages of grouped.values()) {
      machineUsages.sort((a, b) => a.startTime - b.startTime);
    }

    return grouped;
  }, [usages]);

  const sections = React.useMemo(() => {
    const grouped = new Map<string, Machine[]>();

    for (const machine of machines) {
      const key = machine.group ?? "";

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key)?.push(machine);
    }

    return Array.from(grouped.entries()).map(([label, sectionMachines]) => ({
      label,
      machines: sectionMachines,
    }));
  }, [machines]);

  const scheduleRows = React.useMemo<ScheduleRow[]>(() => {
    const rows: ScheduleRow[] = [];

    for (const section of sections) {
      if (section.label) {
        rows.push({
          id: `section-${section.label}`,
          kind: "section",
          label: section.label,
        });
      }

      for (const machine of section.machines) {
        const machineUsages = usagesByMachine.get(machine.id) ?? [];
        const tracks = computeTracks(machineUsages);
        const machineStatus = getMachineStatus(
          machine,
          machineUsages,
          nowDecimal,
        );

        tracks.forEach((track, trackIndex) => {
          rows.push({
            id: `${machine.id}-track-${trackIndex}`,
            kind: "track",
            machine,
            machineStatus,
            track,
            isFirstTrack: trackIndex === 0,
          });
        });
      }
    }

    return rows;
  }, [nowDecimal, sections, usagesByMachine]);

  const minBodyHeight = React.useMemo(
    () =>
      scheduleRows.reduce(
        (total, row) =>
          total + (row.kind === "section" ? SECTION_HEIGHT : ROW_HEIGHT),
        0,
      ),
    [scheduleRows],
  );
  const bodyGridTemplateRows =
    scheduleRows.length > 0
      ? scheduleRows.map(() => "1fr").join(" ")
      : undefined;

  const nowInRange = nowDecimal >= DAY_START && nowDecimal < DAY_END;
  const currentSlotIdx = nowInRange
    ? Math.floor((nowDecimal - DAY_START) * 2)
    : null;
  const nowIndicatorLeft = React.useMemo(
    () => (nowInRange ? getNowIndicatorLeft(nowDecimal) : null),
    [nowDecimal, nowInRange],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1">
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div
            className="grid h-full min-h-full min-w-0 bg-background"
            style={{
              width: `max(100%, ${DAY_MIN_WIDTH}px)`,
              gridTemplateRows: `auto 1fr`,
              height: "100%",
            }}
          >
            <div
              className="sticky top-0 z-20 grid"
              style={{
                gridTemplateColumns: DAY_LAYOUT_TEMPLATE,
                background: "var(--fab-bg-sidebar)",
              }}
            >
              <div
                className="flex items-center"
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 30,
                  height: HEADER_HEIGHT,
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
                  gridTemplateColumns: DAY_TIMELINE_TEMPLATE,
                  height: HEADER_HEIGHT,
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
                const baseHeight =
                  row.kind === "section" ? SECTION_HEIGHT : ROW_HEIGHT;

                if (row.kind === "section") {
                  return (
                    <div
                      key={row.id}
                      className="grid"
                      style={{
                        gridTemplateColumns: DAY_LAYOUT_TEMPLATE,
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
                          gridTemplateColumns: DAY_TIMELINE_TEMPLATE,
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
                      gridTemplateColumns: DAY_LAYOUT_TEMPLATE,
                      minHeight: ROW_HEIGHT,
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
                              background:
                                row.machineStatus === "active"
                                  ? "var(--fab-teal)"
                                  : row.machineStatus === "maintenance"
                                    ? "var(--fab-amber)"
                                    : "var(--fab-text-dim)",
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
                        gridTemplateColumns: DAY_TIMELINE_TEMPLATE,
                        minHeight: baseHeight,
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

                      {row.track.map((usage) => {
                        const { left, width } = getUsagePosition(
                          usage.startTime,
                          usage.endTime,
                        );
                        const isPending = usage.projectStatus === "pending";
                        const canOpenProjectDetails =
                          usage.projectId !== null &&
                          onOpenProjectDetails !== undefined;

                        return (
                          <button
                            key={usage.id}
                            type="button"
                            disabled={!canOpenProjectDetails}
                            onClick={() =>
                              usage.projectId &&
                              onOpenProjectDetails?.(usage.projectId)
                            }
                            className={cn(
                              "absolute z-[5] text-left disabled:cursor-default",
                              canOpenProjectDetails &&
                                "cursor-pointer transition-shadow hover:shadow-sm",
                            )}
                            style={{
                              top: 3,
                              bottom: 3,
                              left: `calc(${left} + 2px)`,
                              width: `max(0px, calc(${width} - 4px))`,
                            }}
                          >
                            <div
                              className={cn(
                                "flex h-full items-center justify-center overflow-hidden rounded-md border px-2 py-1 shadow-sm",
                                usage.color ||
                                  "bg-blue-500/10 border-blue-500 text-blue-700",
                                isPending &&
                                  "border-2 border-dashed opacity-80",
                                canOpenProjectDetails &&
                                  "hover:ring-2 hover:ring-primary/20",
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
});

UsageTable.displayName = "UsageTable";
