import { ResourceStatus } from "../../../convex/constants";

import { DAY_HOURS, DAY_START, HEADER_SLOTS, TOTAL_SLOTS } from "./constants";
import type {
  CalendarAbsoluteTimeRange,
  CalendarMachine,
  CalendarMachineUsage,
} from "./types";

export const CALENDAR_DAY_ROW_HEIGHT = 40;
export const CALENDAR_DAY_WORKSHOP_ROW_HEIGHT = 104;
export const CALENDAR_DAY_SECTION_HEIGHT = 26;
export const CALENDAR_DAY_HEADER_HEIGHT = 44;
export const CALENDAR_DAY_LEADING_COL_WIDTH = 160;
export const CALENDAR_DAY_SLOT_WIDTH = 52;
export const CALENDAR_DAY_TIMELINE_MIN_WIDTH =
  HEADER_SLOTS.length * CALENDAR_DAY_SLOT_WIDTH;
export const CALENDAR_DAY_MIN_WIDTH =
  CALENDAR_DAY_LEADING_COL_WIDTH + CALENDAR_DAY_TIMELINE_MIN_WIDTH;
export const CALENDAR_DAY_LAYOUT_TEMPLATE = `minmax(${CALENDAR_DAY_LEADING_COL_WIDTH}px, 3fr) minmax(${CALENDAR_DAY_TIMELINE_MIN_WIDTH}px, ${HEADER_SLOTS.length}fr)`;
export const CALENDAR_DAY_TIMELINE_TEMPLATE = `repeat(${HEADER_SLOTS.length}, minmax(${CALENDAR_DAY_SLOT_WIDTH}px, 1fr))`;

export const CALENDAR_WEEK_TIME_COL_WIDTH = 72;
export const CALENDAR_WEEK_DAY_MIN_WIDTH = 148;
export const CALENDAR_WEEK_HOUR_ROW_MIN_HEIGHT = 52;
export const CALENDAR_WEEK_TOTAL_HOURS = DAY_HOURS;
export const CALENDAR_WEEK_HEADER_HEIGHT = 61;
export const CALENDAR_WEEK_MIN_GRID_HEIGHT =
  CALENDAR_WEEK_TOTAL_HOURS * CALENDAR_WEEK_HOUR_ROW_MIN_HEIGHT;
export const CALENDAR_WEEK_MIN_TOTAL_HEIGHT =
  CALENDAR_WEEK_HEADER_HEIGHT + CALENDAR_WEEK_MIN_GRID_HEIGHT;

export const CALENDAR_MONTH_DAY_MIN_WIDTH = 144;
export const CALENDAR_MONTH_CELL_MIN_HEIGHT = 152;

export type CalendarMachineStatus = "active" | "maintenance" | "free";

export interface CalendarPackedTrackItem<T> {
  item: T;
  trackIndex: number;
  trackCount: number;
}

export interface CalendarDayBookingEntry {
  id: string;
  kind: "booking";
  usage: CalendarMachineUsage;
  startTime: number;
  endTime: number;
}

export interface CalendarWorkshopSlotCluster {
  id: string;
  kind: "workshop";
  machineId: string;
  startTime: number;
  endTime: number;
  bookingCount: number;
  pendingCount: number;
  members: CalendarMachineUsage[];
}

export type CalendarDayTrackEntry =
  | CalendarDayBookingEntry
  | CalendarWorkshopSlotCluster;

export type CalendarDayScheduleRow =
  | {
      id: string;
      kind: "section";
      label: string;
      rowHeight: number;
    }
  | {
      id: string;
      kind: "track";
      machine: CalendarMachine;
      machineStatus: CalendarMachineStatus;
      entries: CalendarDayTrackEntry[];
      isFirstTrack: boolean;
      rowHeight: number;
    };

function getCalendarMachineStatus(
  machine: CalendarMachine,
  machineUsages: CalendarMachineUsage[],
  nowDecimal: number,
): CalendarMachineStatus {
  if (machine.status === ResourceStatus.UNAVAILABLE) {
    return "maintenance";
  }

  const active = machineUsages.find(
    (usage) => usage.startTime <= nowDecimal && usage.endTime > nowDecimal,
  );

  return active ? "active" : "free";
}

function getWorkshopMemberSortValue(
  status: CalendarMachineUsage["projectStatus"],
) {
  switch (status) {
    case "pending":
      return 0;
    case "approved":
      return 1;
    case "completed":
      return 2;
    case "paid":
      return 3;
    case "rejected":
      return 4;
    case "cancelled":
      return 5;
    default:
      return 99;
  }
}

function buildWorkshopSlotClusters(usages: CalendarMachineUsage[]) {
  const clusters = new Map<string, CalendarMachineUsage[]>();

  for (const usage of usages) {
    const key = `${usage.machineId}:${usage.startTime}:${usage.endTime}`;
    const existing = clusters.get(key);

    if (existing) {
      existing.push(usage);
    } else {
      clusters.set(key, [usage]);
    }
  }

  return Array.from(clusters.entries())
    .map(([key, members]) => {
      const sortedMembers = [...members].sort(
        (left, right) =>
          getWorkshopMemberSortValue(left.projectStatus) -
            getWorkshopMemberSortValue(right.projectStatus) ||
          left.clientName.localeCompare(right.clientName) ||
          left.projectAlias.localeCompare(right.projectAlias),
      );

      return {
        id: `workshop-${key}`,
        kind: "workshop" as const,
        machineId: members[0]!.machineId,
        startTime: members[0]!.startTime,
        endTime: members[0]!.endTime,
        bookingCount: sortedMembers.length,
        pendingCount: sortedMembers.filter((member) => member.isPendingReview)
          .length,
        members: sortedMembers,
      };
    })
    .sort(
      (left, right) =>
        left.startTime - right.startTime || left.endTime - right.endTime,
    );
}

function buildDayTrackEntries(
  machine: CalendarMachine,
  usages: CalendarMachineUsage[],
): CalendarDayTrackEntry[] {
  if (machine.serviceCategoryType === "WORKSHOP") {
    return buildWorkshopSlotClusters(usages);
  }

  return usages.map((usage) => ({
    id: usage.id,
    kind: "booking",
    usage,
    startTime: usage.startTime,
    endTime: usage.endTime,
  }));
}

export function packCalendarTracks<T>(
  items: T[],
  getRange: (item: T) => CalendarAbsoluteTimeRange,
): CalendarPackedTrackItem<T>[] {
  const sortedItems = [...items].sort((left, right) => {
    const leftRange = getRange(left);
    const rightRange = getRange(right);

    return (
      leftRange.startTime - rightRange.startTime ||
      leftRange.endTime - rightRange.endTime
    );
  });
  const tracks: T[][] = [];
  const placements: Array<{ item: T; trackIndex: number }> = [];

  for (const item of sortedItems) {
    const range = getRange(item);
    let placed = false;

    for (const [trackIndex, track] of tracks.entries()) {
      const lastItem = track[track.length - 1];

      if (!lastItem) continue;

      if (range.startTime >= getRange(lastItem).endTime) {
        track.push(item);
        placements.push({ item, trackIndex });
        placed = true;
        break;
      }
    }

    if (!placed) {
      tracks.push([item]);
      placements.push({ item, trackIndex: tracks.length - 1 });
    }
  }

  const trackCount = Math.max(tracks.length, 1);

  return placements.map((placement) => ({
    ...placement,
    trackCount,
  }));
}

export function groupCalendarUsagesByMachine(usages: CalendarMachineUsage[]) {
  const grouped = new Map<string, CalendarMachineUsage[]>();

  for (const usage of usages) {
    const machineUsages = grouped.get(usage.machineId);

    if (machineUsages) {
      machineUsages.push(usage);
    } else {
      grouped.set(usage.machineId, [usage]);
    }
  }

  for (const machineUsages of grouped.values()) {
    machineUsages.sort((left, right) => left.startTime - right.startTime);
  }

  return grouped;
}

export function groupCalendarMachinesBySection(machines: CalendarMachine[]) {
  const grouped = new Map<string, CalendarMachine[]>();

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
}

export function buildCalendarDayScheduleRows(args: {
  machines: CalendarMachine[];
  usages: CalendarMachineUsage[];
  nowDecimal: number;
}) {
  const rows: CalendarDayScheduleRow[] = [];
  const sections = groupCalendarMachinesBySection(args.machines);
  const usagesByMachine = groupCalendarUsagesByMachine(args.usages);

  for (const section of sections) {
    if (section.label) {
      rows.push({
        id: `section-${section.label}`,
        kind: "section",
        label: section.label,
        rowHeight: CALENDAR_DAY_SECTION_HEIGHT,
      });
    }

    for (const machine of section.machines) {
      const machineUsages = usagesByMachine.get(machine.id) ?? [];
      const machineStatus = getCalendarMachineStatus(
        machine,
        machineUsages,
        args.nowDecimal,
      );
      const entries = buildDayTrackEntries(machine, machineUsages);
      const packedEntries = packCalendarTracks(entries, (entry) => ({
        startTime: entry.startTime,
        endTime: entry.endTime,
      }));
      const rowHeight =
        machine.serviceCategoryType === "WORKSHOP"
          ? CALENDAR_DAY_WORKSHOP_ROW_HEIGHT
          : CALENDAR_DAY_ROW_HEIGHT;

      if (packedEntries.length === 0) {
        rows.push({
          id: `${machine.id}-track-0`,
          kind: "track",
          machine,
          machineStatus,
          entries: [],
          isFirstTrack: true,
          rowHeight,
        });
        continue;
      }

      const entriesByTrack = new Map<number, CalendarDayTrackEntry[]>();

      for (const placement of packedEntries) {
        const trackEntries = entriesByTrack.get(placement.trackIndex);

        if (trackEntries) {
          trackEntries.push(placement.item);
        } else {
          entriesByTrack.set(placement.trackIndex, [placement.item]);
        }
      }

      const trackCount = packedEntries[0]?.trackCount ?? 1;

      for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
        rows.push({
          id: `${machine.id}-track-${trackIndex}`,
          kind: "track",
          machine,
          machineStatus,
          entries: entriesByTrack.get(trackIndex) ?? [],
          isFirstTrack: trackIndex === 0,
          rowHeight,
        });
      }
    }
  }

  return rows;
}

export function getCalendarDayUsagePosition(
  startTime: number,
  endTime: number,
) {
  const startIndex = Math.max(Math.round((startTime - DAY_START) * 2), 0);
  const slotSpan = Math.max(
    1,
    Math.min(Math.round((endTime - startTime) * 2), TOTAL_SLOTS - startIndex),
  );

  return {
    left: `${(startIndex / HEADER_SLOTS.length) * 100}%`,
    width: `${(slotSpan / HEADER_SLOTS.length) * 100}%`,
  };
}

export function getCalendarDayNowIndicatorLeft(nowDecimal: number) {
  return `${(((nowDecimal - DAY_START) * 2) / HEADER_SLOTS.length) * 100}%`;
}

export function isWorkshopTrackEntry(
  entry: CalendarDayTrackEntry,
): entry is CalendarWorkshopSlotCluster {
  return entry.kind === "workshop";
}
