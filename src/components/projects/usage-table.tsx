"use client";

import * as React from "react";
import { ResourceStatus } from "@convex/constants";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { Plus, HardDrive, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { cn } from "@/lib/utils";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Interface representing a Machine (Resource) in the system.
 */
export interface Machine {
  id: string;
  name: string;
  status: typeof ResourceStatus.AVAILABLE | typeof ResourceStatus.UNAVAILABLE;
  description: string;
}

/**
 * Interface representing a Machine Usage (Booking).
 */
export interface MachineUsage {
  id: string;
  machineId: string;
  projectId: string;
  projectAlias: string;
  projectStatus: "pending" | "approved" | "rejected" | "completed";
  makerName: string;
  date: number; // Unix timestamp (seconds)
  startTime: number; // Decimal hours (e.g., 7.5 for 07:30)
  endTime: number;
  color?: string; // Optional UI specific field for category differentiation
}

interface UsageTableProps {
  machines: Machine[];
  usages: MachineUsage[];
}

/**
 * Generates 30-minute intervals from 09:00 to 18:00
 */
const SLOTS = Array.from({ length: 19 }, (_, i) => 9 + i * 0.5);

/**
 * Formats a decimal hour into a readable time string
 */
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

export function UsageTable({ machines, usages }: UsageTableProps) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Desktop Table View (Visible on md and up) */}
      <div className="hidden md:block bg-background relative text-xs max-h-full overflow-y-auto overflow-x-hidden px-4">
        <table className="w-full caption-bottom border-collapse table-fixed">
          <TableHeader className="sticky top-0 z-40 shadow-sm bg-muted">
            <TableRow className="hover:bg-transparent bg-muted h-10">
              <TableHead className="w-28 sticky left-0 top-0 z-50 bg-muted border-b border-r font-bold h-10">
                Machines
              </TableHead>
              {SLOTS.map((slot) => (
                <TableHead
                  key={slot}
                  className="text-left pl-1 font-semibold border-b border-r sticky top-0 z-40 bg-muted h-10 whitespace-nowrap"
                >
                  {formatShortTime(slot)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => {
              const machineUsages = usages.filter(
                (u) => u.machineId === machine.id,
              );
              const tracks = computeTracks(machineUsages);

              return (
                <React.Fragment key={machine.id}>
                  {tracks.map((track, trackIdx) => (
                    <TableRow
                      key={`${machine.id}-track-${trackIdx}`}
                      className="hover:bg-transparent h-16 max-h-16 overflow-hidden"
                    >
                      {trackIdx === 0 && (
                        <TableCell
                          rowSpan={tracks.length}
                          className="sticky left-0 z-20 bg-background border-b border-r font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs whitespace-normal break-words p-0 h-16 max-h-16 overflow-hidden w-28"
                        >
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                className="w-full h-full p-1.5 flex items-start gap-1.5 text-left hover:bg-muted/50 transition-colors"
                                title="View Resource Details"
                              >
                                <div
                                  className={cn(
                                    "mt-1 h-2 w-2 rounded-full shrink-0",
                                    machine.status === ResourceStatus.AVAILABLE
                                      ? "bg-emerald-500"
                                      : "bg-red-500",
                                  )}
                                />
                                <span className="leading-tight">
                                  {machine.name}
                                </span>
                              </button>
                            </DialogTrigger>
                            <MachineDetailsDialog machine={machine} />
                          </Dialog>
                        </TableCell>
                      )}

                      {SLOTS.map((slot, index) => {
                        const usage = track.find((u) => u.startTime === slot);

                        if (usage) {
                          const durationInSlots =
                            (usage.endTime - usage.startTime) / 0.5;
                          const clampedColSpan = Math.min(
                            durationInSlots,
                            SLOTS.length - index,
                          );

                          const isPending = usage.projectStatus === "pending";

                          return (
                            <TableCell
                              key={`${machine.id}-track-${trackIdx}-${slot}`}
                              className="p-0.5 border-b border-r bg-muted/5 align-top h-16 max-h-16 overflow-hidden"
                              colSpan={clampedColSpan}
                            >
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Card
                                    className={cn(
                                      "h-full border shadow-sm rounded-md px-2 py-1 flex items-center justify-center overflow-hidden transition-all cursor-pointer hover:ring-2 hover:ring-primary/20",
                                      usage.color ||
                                        "bg-blue-500/10 border-blue-500 text-blue-700",
                                      isPending &&
                                        "border-dashed border-2 opacity-80",
                                    )}
                                  >
                                    <span className="font-semibold text-sm leading-tight truncate w-full text-center">
                                      {usage.projectAlias}
                                    </span>
                                  </Card>
                                </DialogTrigger>
                                <UsageDetailsDialog
                                  usage={usage}
                                  machine={machine}
                                />
                              </Dialog>
                            </TableCell>
                          );
                        }

                        const isCovered = track.some(
                          (u) => slot > u.startTime && slot < u.endTime,
                        );

                        if (isCovered) return null;

                        return (
                          <TableCell
                            key={`${machine.id}-track-${trackIdx}-${slot}`}
                            className="group relative p-0.5 border-b border-r h-16 max-h-16 overflow-hidden transition-colors hover:bg-muted/10"
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 absolute inset-2 h-auto text-[10px] font-semibold text-muted-foreground gap-1 border-dashed border-2 hover:bg-background hover:text-primary transition-all duration-200"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Usage
                                </Button>
                              </DialogTrigger>
                              <AddUsageDialog machine={machine} slot={slot} />
                            </Dialog>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </table>
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <AddUsageDialog machine={machine} />
                </Dialog>
              </div>

              {/* Usage rows */}
              {machineUsages.length > 0 ? (
                <div className="divide-y">
                  {machineUsages.map((usage) => (
                    <Dialog key={usage.id}>
                      <DialogTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60",
                          )}
                        >
                          {/* Color strip */}
                          <div
                            className={cn(
                              "h-8 w-1 rounded-full shrink-0",
                              usage.color ? "bg-blue-500" : "bg-blue-400",
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
                      </DialogTrigger>
                      <UsageDetailsDialog usage={usage} machine={machine} />
                    </Dialog>
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
 * Placeholder Dialog Content for viewing usage details
 */
function UsageDetailsDialog({
  usage,
  machine,
}: {
  usage: MachineUsage;
  machine: Machine;
}) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Usage Details
        </DialogTitle>
        <DialogDescription>
          Information regarding the scheduled machine time.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold">Project:</span>
          <span className="col-span-3 text-sm">{usage.projectAlias}</span>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold">Machine:</span>
          <span className="col-span-3 text-sm">{machine.name}</span>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold">Maker:</span>
          <span className="col-span-3 text-sm">{usage.makerName}</span>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold">Time:</span>
          <span className="col-span-3 text-sm">
            {formatDecimalTime(usage.startTime)} -{" "}
            {formatDecimalTime(usage.endTime)}
          </span>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-sm font-bold">Status:</span>
          <span className="col-span-3">
            <Badge
              variant={
                usage.projectStatus === "approved" ? "default" : "secondary"
              }
              className="capitalize"
            >
              {usage.projectStatus}
            </Badge>
          </span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" className="w-full sm:w-auto">
          Close
        </Button>
        {usage.projectStatus === "pending" && (
          <Button type="button" className="w-full sm:w-auto">
            Review Project
          </Button>
        )}
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
