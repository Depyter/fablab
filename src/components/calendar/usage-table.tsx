"use client";

import * as React from "react";
import { ResourceStatus } from "@convex/constants";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { Info } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import {
  type Column,
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const ROW_HEIGHT = 40;
export const SECTION_HEIGHT = 26;
export const HEADER_HEIGHT = 44;
export const DAY_START = 9;
export const DAY_END = 18;
export const TOTAL_SLOTS = (DAY_END - DAY_START) * 2;
export const RESOURCES_COL_WIDTH = 160;
export const SLOT_WIDTH = 52;

export const HEADER_SLOTS = Array.from(
  { length: TOTAL_SLOTS + 1 },
  (_, index) => DAY_START + index * 0.5,
);

type MachineStatus = "active" | "maintenance" | "free";

export interface Machine {
  id: string;
  name: string;
  status: typeof ResourceStatus.AVAILABLE | typeof ResourceStatus.UNAVAILABLE;
  description: string;
  group?: string;
}

export interface MachineUsage {
  id: string;
  machineId: string;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "completed"
    | "paid"
    | "cancelled";
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
  itemLabelSingular?: string;
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

const columnHelper = createColumnHelper<ScheduleRow>();

function getMachineStatus(
  machine: Machine,
  machineUsages: MachineUsage[],
  nowDecimal: number,
): MachineStatus {
  if (machine.status === ResourceStatus.UNAVAILABLE) return "maintenance";

  const active = machineUsages.find(
    (usage) =>
      usage.startTime <= nowDecimal && usage.endTime > nowDecimal,
  );

  return active ? "active" : "free";
}

const formatShortTime = (decimalHour: number) => {
  const hours = Math.floor(decimalHour);
  const minutes = (decimalHour % 1) * 60;

  return format(
    setMinutes(setHours(startOfDay(new Date()), hours), minutes),
    minutes === 0 ? "ha" : "h:mm",
  );
};

function getSlotColumnId(decimalHour: number) {
  return `slot-${Math.round(decimalHour * 2)}`;
}

function getSlotIndex(decimalHour: number) {
  return Math.round((decimalHour - DAY_START) * 2);
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

function getPinnedStyle<TData>(
  column?: Column<TData>,
): React.CSSProperties | undefined {
  if (column?.getIsPinned() !== "left") return undefined;

  return {
    position: "sticky",
    left: column.getStart("left"),
  };
}

export const UsageTable = React.memo(function UsageTable({
  machines,
  usages,
  onOpenProjectDetails,
  leadingColumnLabel = "RESOURCES",
  itemLabelSingular = "Resource",
}: UsageTableProps) {
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);
  const [nowDate, setNowDate] = React.useState<Date>(() => new Date());
  const nowDecimal = nowDate.getHours() + nowDate.getMinutes() / 60;

  React.useEffect(() => {
    const tick = setInterval(() => setNowDate(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const totalProjects = React.useMemo(
    () =>
      new Set(usages.flatMap((usage) => (usage.projectId ? [usage.projectId] : [])))
        .size,
    [usages],
  );

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
        const machineStatus = getMachineStatus(machine, machineUsages, nowDecimal);

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

  const columns = React.useMemo<ColumnDef<ScheduleRow>[]>(
    () => [
      columnHelper.display({
        id: "resource",
        header: leadingColumnLabel,
        size: RESOURCES_COL_WIDTH,
      }),
      ...HEADER_SLOTS.map((slot) =>
        columnHelper.display({
          id: getSlotColumnId(slot),
          header: slot % 1 === 0 ? formatShortTime(slot) : "",
          size: SLOT_WIDTH,
        }),
      ),
    ],
    [leadingColumnLabel],
  );

  // TanStack Table is intentionally isolated to this client leaf.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: scheduleRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnPinning: { left: ["resource"] },
    },
    columnResizeMode: "onChange",
    defaultColumn: {
      size: SLOT_WIDTH,
      minSize: SLOT_WIDTH,
    },
  });

  const rowVirtualizer = useVirtualizer({
    count: scheduleRows.length,
    getScrollElement: () => scrollViewportRef.current,
    estimateSize: (index) =>
      scheduleRows[index]?.kind === "section" ? SECTION_HEIGHT : ROW_HEIGHT,
    overscan: 6,
  });

  const resourceColumn = table.getColumn("resource");
  const totalHeight = rowVirtualizer.getTotalSize();
  const virtualRows = rowVirtualizer.getVirtualItems();
  const nowInRange = nowDecimal >= DAY_START && nowDecimal < DAY_END;
  const currentSlotIdx = nowInRange
    ? Math.floor((nowDecimal - DAY_START) * 2)
    : null;

  const getSlotMetrics = React.useCallback(
    (slot: number) => {
      const column = table.getColumn(getSlotColumnId(slot));

      return {
        left: column?.getStart() ?? 0,
        width: column?.getSize() ?? SLOT_WIDTH,
      };
    },
    [table],
  );

  const nowIndicatorLeft = React.useMemo(() => {
    if (currentSlotIdx === null) return null;

    const slot = HEADER_SLOTS[currentSlotIdx];
    const { left, width } = getSlotMetrics(slot);
    const progressWithinSlot = (nowDecimal - slot) / 0.5;

    return left + width * progressWithinSlot;
  }, [currentSlotIdx, getSlotMetrics, nowDecimal]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="hidden min-h-0 flex-1 md:flex">
        <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
          <div
            className="relative min-w-fit"
            style={{
              width: table.getTotalSize(),
              minHeight: HEADER_HEIGHT + totalHeight,
            }}
          >
            {nowIndicatorLeft !== null && (
              <div
                aria-label="Now indicator"
                style={{
                  position: "absolute",
                  left: nowIndicatorLeft,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "var(--fab-magenta)",
                  zIndex: 6,
                  pointerEvents: "none",
                }}
              >
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
              </div>
            )}

            <table
              style={{
                width: table.getTotalSize(),
                tableLayout: "fixed",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <TableHeader
                className="sticky top-0 z-20"
                style={{ background: "var(--fab-bg-sidebar)" }}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-0 hover:bg-transparent"
                    style={{ height: HEADER_HEIGHT }}
                  >
                    {headerGroup.headers.map((header) => {
                      const isCurrentHeader =
                        currentSlotIdx !== null &&
                        header.column.id ===
                          getSlotColumnId(HEADER_SLOTS[currentSlotIdx]);

                      return (
                        <TableHead
                          key={header.id}
                          className="px-1 text-left text-[10px] font-medium whitespace-nowrap"
                          style={{
                            width: header.getSize(),
                            minWidth: header.getSize(),
                            maxWidth: header.getSize(),
                            zIndex: header.column.getIsPinned() ? 30 : 20,
                            background: isCurrentHeader
                              ? "rgba(157,26,88,0.06)"
                              : "var(--fab-bg-sidebar)",
                            borderBottom: "1px solid var(--fab-border-md)",
                            borderLeft:
                              header.column.id === "resource"
                                ? undefined
                                : "1px solid var(--fab-border)",
                            borderRight:
                              header.column.id === "resource"
                                ? "1px solid var(--fab-border-md)"
                                : undefined,
                            color:
                              header.column.id === "resource"
                                ? "var(--fab-text-muted)"
                                : isCurrentHeader
                                  ? "var(--fab-magenta)"
                                  : "var(--fab-text-muted)",
                            fontWeight:
                              header.column.id === "resource"
                                ? 700
                                : isCurrentHeader
                                  ? 700
                                  : 500,
                            letterSpacing:
                              header.column.id === "resource"
                                ? "0.1em"
                                : undefined,
                            textTransform:
                              header.column.id === "resource"
                                ? "uppercase"
                                : undefined,
                            paddingLeft: header.column.id === "resource" ? 12 : 4,
                            ...getPinnedStyle(header.column),
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
            </table>

            <div className="relative" style={{ height: totalHeight }}>
              {virtualRows.map((virtualRow) => {
                const row = scheduleRows[virtualRow.index];

                if (!row) return null;

                if (row.kind === "section") {
                  return (
                    <div
                      key={row.id}
                      className="absolute left-0 flex items-center"
                      style={{
                        top: virtualRow.start,
                        height: SECTION_HEIGHT,
                        width: table.getTotalSize(),
                        background: "rgba(220,215,245,0.55)",
                        borderTop: "1px solid var(--fab-border-md)",
                        borderBottom: "1px solid var(--fab-border-md)",
                      }}
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{
                          paddingLeft: 12,
                          color: "var(--fab-text-dim)",
                        }}
                      >
                        {row.label}
                      </span>
                    </div>
                  );
                }

                const stickyStyle = getPinnedStyle(resourceColumn);

                return (
                  <div
                    key={row.id}
                    className="absolute left-0"
                    style={{
                      top: virtualRow.start,
                      width: table.getTotalSize(),
                      height: ROW_HEIGHT,
                    }}
                  >
                    {HEADER_SLOTS.map((slot, slotIndex) => {
                      const { left, width } = getSlotMetrics(slot);
                      const isBoundary = slot >= DAY_END;
                      const isHighlightedSlot =
                        currentSlotIdx !== null && slotIndex === currentSlotIdx;

                      return (
                        <div
                          key={`${row.id}-${slot}`}
                          aria-hidden
                          style={{
                            position: "absolute",
                            left,
                            top: 0,
                            width,
                            height: ROW_HEIGHT,
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

                    <div
                      style={{
                        position: "sticky",
                        left: stickyStyle?.left,
                        top: 0,
                        zIndex: 8,
                        width: resourceColumn?.getSize() ?? RESOURCES_COL_WIDTH,
                        height: ROW_HEIGHT,
                        background: "var(--fab-bg-main)",
                        borderBottom: "1px solid var(--fab-border-md)",
                        borderRight: "1px solid var(--fab-border-md)",
                      }}
                    >
                      {row.isFirstTrack && (
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

                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--fab-text-primary)]">
                            {row.machine.name}
                          </span>

                          {row.machineStatus !== "free" && (
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
                          )}
                        </div>
                      )}
                    </div>

                    {row.track.map((usage) => {
                      const startIndex = getSlotIndex(usage.startTime);
                      const clampedDurationSlots = Math.max(
                        1,
                        Math.min(
                          (usage.endTime - usage.startTime) / 0.5,
                          TOTAL_SLOTS - startIndex,
                        ),
                      );
                      const startMetrics = getSlotMetrics(usage.startTime);
                      const usageWidth = Array.from(
                        { length: clampedDurationSlots },
                        (_, offset) =>
                          getSlotMetrics(HEADER_SLOTS[startIndex + offset]).width,
                      ).reduce((sum, width) => sum + width, 0);
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
                            "absolute top-[3px] z-[5] h-[calc(100%-6px)] text-left disabled:cursor-default",
                            canOpenProjectDetails &&
                              "cursor-pointer transition-shadow hover:shadow-sm",
                          )}
                          style={{
                            left: startMetrics.left + 2,
                            width: Math.max(0, usageWidth - 4),
                          }}
                        >
                          <div
                            className={cn(
                              "flex h-full items-center justify-center overflow-hidden rounded-md border px-2 py-1 shadow-sm",
                              usage.color ||
                                "bg-blue-500/10 border-blue-500 text-blue-700",
                              isPending && "border-2 border-dashed opacity-80",
                              canOpenProjectDetails && "hover:ring-2 hover:ring-primary/20",
                            )}
                          >
                            <span className="w-full truncate text-center text-xs font-semibold leading-tight">
                              {usage.projectAlias}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="md:hidden flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-none hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [scrollbar-width:thick]">
        {machines.map((machine) => {
          const machineUsages = usagesByMachine.get(machine.id) ?? [];

          return (
            <div key={machine.id}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur-sm">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-80"
                      title={`View ${itemLabelSingular} Details`}
                    >
                      <div
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          machine.status === ResourceStatus.AVAILABLE
                            ? "bg-emerald-500"
                            : "bg-red-500",
                        )}
                      />
                      <span className="truncate text-sm font-semibold">
                        {machine.name}
                      </span>
                    </button>
                  </DialogTrigger>
                  <ScheduleItemDetailsDialog
                    machine={machine}
                    itemLabelSingular={itemLabelSingular}
                  />
                </Dialog>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {format(nowDate, "hh:mm a")}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {totalProjects} {totalProjects === 1 ? "project" : "projects"}
                  </Badge>
                </div>
              </div>

              {machineUsages.length > 0 ? (
                <div className="divide-y">
                  {machineUsages.map((usage) => {
                    const canOpenProjectDetails =
                      usage.projectId !== null &&
                      onOpenProjectDetails !== undefined;

                    return (
                      <button
                        key={usage.id || `${usage.machineId}-${usage.startTime}`}
                        type="button"
                        disabled={!canOpenProjectDetails}
                        onClick={() =>
                          usage.projectId &&
                          onOpenProjectDetails?.(usage.projectId)
                        }
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left",
                          canOpenProjectDetails &&
                            "transition-colors hover:bg-muted/40 active:bg-muted/60",
                          !canOpenProjectDetails && "cursor-default",
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-1 shrink-0 rounded-full",
                            usage.color || "bg-blue-500",
                            usage.projectStatus === "pending" && "opacity-50",
                          )}
                        />
                        <span className="flex-1 truncate text-sm font-medium">
                          {usage.projectAlias}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-muted-foreground">
                          {formatShortTime(usage.startTime)}-
                          {formatShortTime(usage.endTime)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-3 text-xs italic text-muted-foreground/60">
                  No bookings for today
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

UsageTable.displayName = "UsageTable";

function ScheduleItemDetailsDialog({
  machine,
  itemLabelSingular,
}: {
  machine: Machine;
  itemLabelSingular: string;
}) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          {machine.name} Details
        </DialogTitle>
        <DialogDescription>
          Information regarding this {itemLabelSingular.toLowerCase()}.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold text-muted-foreground">Name:</span>
          <span className="col-span-3 text-sm font-medium">{machine.name}</span>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold text-muted-foreground">
            Status:
          </span>
          <div className="col-span-3">
            <Badge
              variant={
                machine.status === ResourceStatus.AVAILABLE
                  ? "secondary"
                  : "destructive"
              }
              className="capitalize"
            >
              {machine.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-4 items-start gap-4">
          <span className="text-sm font-bold text-muted-foreground">
            Description:
          </span>
          <span className="col-span-3 whitespace-pre-wrap text-sm leading-relaxed">
            {machine.description || "No description provided."}
          </span>
        </div>
      </div>

      <DialogFooter>
        <DialogTrigger asChild>
          <Button variant="outline" type="button" className="w-full sm:w-auto">
            Close
          </Button>
        </DialogTrigger>
      </DialogFooter>
    </DialogContent>
  );
}
