"use client";

import * as React from "react";
import { ResourceStatus } from "@convex/constants";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { Plus, HardDrive, Info } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { ProjectDetails } from "./project-details";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Shared layout constants ─────────────────────────────────────────────────
const ROW_HEIGHT = 40; // px — every machine row
const SECTION_HEIGHT = 26; // px — section divider rows
const DAY_START = 9; // 9:00 AM
const DAY_END = 18; // 6:00 PM
const TOTAL_SLOTS = (DAY_END - DAY_START) * 2; // 18 bookable half-hour slots
const RESOURCES_COL_WIDTH = 160; // px — sticky left column

/** Header slots: 9:00, 9:30, …, 17:30, 18:00 — includes 6 PM boundary label */
const HEADER_SLOTS = Array.from(
  { length: TOTAL_SLOTS + 1 },
  (_, i) => DAY_START + i * 0.5,
);

// ─── Types ────────────────────────────────────────────────────────────────────
type MachineStatus = "active" | "maintenance" | "free";

/** Interface representing a Machine (Resource) in the system. */
export interface Machine {
  id: string;
  name: string;
  status: typeof ResourceStatus.AVAILABLE | typeof ResourceStatus.UNAVAILABLE;
  description: string;
  /** Optional group label for section dividers */
  group?: string;
}

/** Interface representing a Machine Usage (Booking). */
export interface MachineUsage {
  id: string;
  machineId: string;
  projectId: string;
  projectAlias: string;
  projectStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "completed"
    | "cancelled"
    | "paid";
  makerName: string;
  date: number; // Unix timestamp (seconds)
  startTime: number; // Decimal hours (e.g., 7.5 for 07:30)
  endTime: number;
  color?: string;
}

interface MachineSection {
  label: string;
  machines: Machine[];
}

interface UsageTableProps {
  machines: Machine[];
  usages: MachineUsage[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMachineStatus(
  machine: Machine,
  usages: MachineUsage[],
  nowDecimal: number,
): MachineStatus {
  if (machine.status === ResourceStatus.UNAVAILABLE) return "maintenance";
  const active = usages.find(
    (u) =>
      u.machineId === machine.id &&
      u.startTime <= nowDecimal &&
      u.endTime > nowDecimal,
  );
  return active ? "active" : "free";
}

const formatDecimalTime = (decimalHour: number) => {
  const hours = Math.floor(decimalHour);
  const minutes = (decimalHour % 1) * 60;
  return format(
    setMinutes(setHours(startOfDay(new Date()), hours), minutes),
    "hh:mm a",
  );
};

const formatShortTime = (decimalHour: number) => {
  const hours = Math.floor(decimalHour);
  const minutes = (decimalHour % 1) * 60;
  return format(
    setMinutes(setHours(startOfDay(new Date()), hours), minutes),
    minutes === 0 ? "ha" : "h:mm",
  );
};

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

// ─── Main UsageTable component ────────────────────────────────────────────────
export function UsageTable({ machines, usages }: UsageTableProps) {
  // Live time — updates every 60 s
  const [nowDate, setNowDate] = React.useState<Date>(() => new Date());
  const nowDecimal = nowDate.getHours() + nowDate.getMinutes() / 60;

  React.useEffect(() => {
    const tick = setInterval(() => setNowDate(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  // Total unique projects scheduled today
  const totalProjects = React.useMemo(
    () => new Set(usages.map((u) => u.projectId).filter(Boolean)).size,
    [usages],
  );

  // Group machines by optional `group` field
  const sections: MachineSection[] = React.useMemo(() => {
    const grouped = new Map<string, Machine[]>();
    for (const m of machines) {
      const key = m.group ?? "";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }
    return Array.from(grouped.entries()).map(([label, ms]) => ({
      label,
      machines: ms,
    }));
  }, [machines]);

  // Live indicator values
  const nowInRange = nowDecimal >= DAY_START && nowDecimal < DAY_END;
  const currentSlotIdx = Math.floor((nowDecimal - DAY_START) * 2);
  // Fraction across the slot grid for the now-line
  const nowFraction = nowInRange
    ? (nowDecimal - DAY_START) / (DAY_END - DAY_START)
    : null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* ── Desktop view ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        {/* Scrollable table — fills remaining space */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
          {/* Now-line — spans full scrollable height, positioned via calc */}
          {nowFraction !== null && (
            <div
              aria-label="Now indicator"
              style={{
                position: "absolute",
                left: `calc(${RESOURCES_COL_WIDTH}px + (100% - ${RESOURCES_COL_WIDTH}px) * ${nowFraction})`,
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

          {/* Table: table-fixed + w-full fills the container width */}
          <table
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            {/* Sticky time header */}
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
                {/* Resources column header */}
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
                  RESOURCES
                </th>

                {/* Slot header cells */}
                {HEADER_SLOTS.map((slot, i) => {
                  const isHighlighted = nowInRange && i === currentSlotIdx;
                  const isHour = slot % 1 === 0;
                  return (
                    <th
                      key={slot}
                      style={{
                        background: isHighlighted
                          ? "rgba(157,26,88,0.06)"
                          : "var(--fab-bg-sidebar)",
                        borderBottom: "1px solid var(--fab-border-md)",
                        borderLeft: "1px solid var(--fab-border)",
                        textAlign: "left",
                        paddingLeft: 4,
                        overflow: "hidden",
                        fontSize: 10,
                        fontWeight: isHighlighted ? 700 : 500,
                        color: isHighlighted
                          ? "var(--fab-magenta)"
                          : "var(--fab-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isHour ? formatShortTime(slot) : ""}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {sections.map((section) => (
                <React.Fragment key={section.label || "__default"}>
                  {/* Section divider — spans all columns */}
                  {section.label && (
                    <tr style={{ height: SECTION_HEIGHT }}>
                      <td
                        colSpan={TOTAL_SLOTS + 2}
                        style={{
                          background: "rgba(220,215,245,0.55)",
                          borderTop: "1px solid var(--fab-border-md)",
                          borderBottom: "1px solid var(--fab-border-md)",
                          paddingLeft: 12,
                          fontWeight: 700,
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--fab-text-dim)",
                        }}
                      >
                        {section.label}
                      </td>
                    </tr>
                  )}

                  {/* Machine rows */}
                  {section.machines.map((machine) => {
                    const machineUsages = usages.filter(
                      (u) => u.machineId === machine.id,
                    );
                    const tracks = computeTracks(machineUsages);
                    const status = getMachineStatus(
                      machine,
                      usages,
                      nowDecimal,
                    );

                    return tracks.map((track, trackIdx) => (
                      <tr
                        key={`${machine.id}-${trackIdx}`}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Resources cell — only on first track, rowSpan covers all tracks */}
                        {trackIdx === 0 && (
                          <td
                            rowSpan={tracks.length}
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
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                paddingLeft: 12,
                                paddingRight: 8,
                                height: "100%",
                              }}
                            >
                              {/* Status dot */}
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  background:
                                    status === "active"
                                      ? "var(--fab-teal)"
                                      : status === "maintenance"
                                        ? "var(--fab-amber)"
                                        : "var(--fab-text-dim)",
                                  animation:
                                    status === "active"
                                      ? "dotPulse 2.2s ease infinite"
                                      : "none",
                                }}
                              />
                              {/* Machine name */}
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 11.5,
                                  color: "var(--fab-text-primary)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {machine.name}
                              </span>
                              {/* Status badge */}
                              {status !== "free" && (
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 9,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    flexShrink: 0,
                                    background:
                                      status === "active"
                                        ? "var(--fab-teal-light)"
                                        : "var(--fab-amber-light)",
                                    color:
                                      status === "active"
                                        ? "var(--fab-teal)"
                                        : "var(--fab-amber)",
                                  }}
                                >
                                  {status === "active" ? "On" : "Maint"}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Slot cells */}
                        {HEADER_SLOTS.map((slot, i) => {
                          const usage = track.find((u) => u.startTime === slot);

                          if (usage) {
                            const durationSlots =
                              (usage.endTime - usage.startTime) / 0.5;
                            const clampedColSpan = Math.min(
                              durationSlots,
                              TOTAL_SLOTS - i,
                            );
                            const isPending = usage.projectStatus === "pending";

                            return (
                              <td
                                key={slot}
                                colSpan={clampedColSpan}
                                style={{
                                  padding: "3px 2px",
                                  borderBottom:
                                    "1px solid var(--fab-border-soft)",
                                  borderLeft: "1px solid var(--fab-border)",
                                  height: ROW_HEIGHT,
                                }}
                              >
                                <ProjectDetails
                                  projectId={usage.projectId as Id<"projects">}
                                  trigger={
                                    <Card
                                      className={cn(
                                        "h-full border shadow-sm rounded-md px-2 py-1 flex items-center justify-center overflow-hidden transition-all cursor-pointer hover:ring-2 hover:ring-primary/20",
                                        usage.color ||
                                          "bg-blue-500/10 border-blue-500 text-blue-700",
                                        isPending &&
                                          "border-dashed border-2 opacity-80",
                                      )}
                                    >
                                      <span className="font-semibold text-xs leading-tight truncate w-full text-center">
                                        {usage.projectAlias}
                                      </span>
                                    </Card>
                                  }
                                />
                              </td>
                            );
                          }

                          const isCovered = track.some(
                            (u) => slot > u.startTime && slot < u.endTime,
                          );
                          if (isCovered) return null;

                          const isHighlightedSlot =
                            nowInRange && i === currentSlotIdx;
                          // 6 PM boundary cell — label only, no content
                          const isBoundary = slot >= DAY_END;

                          return (
                            <td
                              key={slot}
                              style={{
                                borderBottom:
                                  "1px solid var(--fab-border-soft)",
                                borderLeft: "1px solid var(--fab-border)",
                                background: isBoundary
                                  ? "var(--fab-bg-sidebar)"
                                  : isHighlightedSlot
                                    ? "rgba(181,32,79,0.03)"
                                    : "transparent",
                              }}
                            />
                          );
                        })}
                      </tr>
                    ));
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View (Visible below md) */}
      <div className="md:hidden flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-none hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [scrollbar-width:thick]">
        {machines.map((machine) => {
          const machineUsages = usages
            .filter((u) => u.machineId === machine.id)
            .sort((a, b) => a.startTime - b.startTime);

          return (
            <div key={machine.id}>
              {/* Compact sticky machine header */}
              <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-4 py-2 border-b">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity"
                      title="View Resource Details"
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          machine.status === ResourceStatus.AVAILABLE
                            ? "bg-emerald-500"
                            : "bg-red-500",
                        )}
                      />
                      <span className="font-semibold text-sm truncate">
                        {machine.name}
                      </span>
                    </button>
                  </DialogTrigger>
                  <MachineDetailsDialog machine={machine} />
                </Dialog>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {format(nowDate, "hh:mm a")}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/60 border rounded px-1.5 py-0.5">
                    {totalProjects}{" "}
                    {totalProjects === 1 ? "project" : "projects"}
                  </span>
                </div>
              </div>

              {/* Usage rows */}
              {machineUsages.length > 0 ? (
                <div className="divide-y">
                  {machineUsages.map((usage) => (
                    <ProjectDetails
                      key={usage.id || `${usage.machineId}-${usage.startTime}`}
                      projectId={usage.projectId as Id<"projects">}
                      trigger={
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60",
                          )}
                        >
                          {/* Color strip */}
                          <div
                            className={cn(
                              "h-8 w-1 rounded-full shrink-0",
                              usage.color || "bg-blue-500",
                              usage.projectStatus === "pending" && "opacity-50",
                            )}
                          />
                          <span className="flex-1 text-sm font-medium truncate">
                            {usage.projectAlias}
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap shrink-0">
                            {formatShortTime(usage.startTime)}–
                            {formatShortTime(usage.endTime)}
                          </span>
                        </button>
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-muted-foreground/60 italic">
                  No bookings for today
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Dialog Content for viewing machine resource details
 */
function MachineDetailsDialog({ machine }: { machine: Machine }) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          {machine.name} Details
        </DialogTitle>
        <DialogDescription>
          Information regarding this resource.
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
          <span className="col-span-3">
            <Badge
              className={cn(
                "capitalize",
                machine.status === ResourceStatus.AVAILABLE
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-red-100 text-red-700 hover:bg-red-200",
              )}
            >
              {machine.status}
            </Badge>
          </span>
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <span className="text-sm font-bold text-muted-foreground">
            Description:
          </span>
          <span className="col-span-3 text-sm whitespace-pre-wrap leading-relaxed">
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

/**
 * Placeholder Dialog Content for adding new usage
 */
function AddUsageDialog({
  machine,
  slot,
}: {
  machine: Machine;
  slot?: number;
}) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Add Machine Usage
        </DialogTitle>
        <DialogDescription>
          Schedule new time on {machine.name}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <p className="text-sm text-muted-foreground">
          {slot !== undefined
            ? `Starting at ${formatDecimalTime(slot)}`
            : "Select a time range to book this machine."}
        </p>
        <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/10">
          <HardDrive className="h-8 w-8 opacity-20" />
          <span className="text-xs font-medium">Booking Form Placeholder</span>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="w-full sm:w-auto">
          Create Booking
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Minimal Badge replacement if not imported
function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
