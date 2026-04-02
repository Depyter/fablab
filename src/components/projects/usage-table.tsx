"use client";

import * as React from "react";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import {
  Plus,
  Clock,
  User,
  HardDrive,
  Hash,
  CheckCircle2,
  Timer,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  status: "Available" | "Unavailable";
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
  projectStatus: "pending" | "approved" | "rejected";
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
    <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
      {/* Desktop Table View (Visible on md and up) */}
      <div className="hidden md:block border rounded-lg bg-background shadow-sm overflow-auto relative text-xs max-h-full">
        <table className="w-full caption-bottom border-collapse table-fixed min-w-[2400px]">
          <TableHeader className="sticky top-0 z-40 shadow-sm bg-muted">
            <TableRow className="hover:bg-transparent bg-muted h-10">
              <TableHead className="w-[200px] sticky left-0 top-0 z-50 bg-muted border-b border-r font-bold h-10">
                Machines
              </TableHead>
              {SLOTS.map((slot) => (
                <TableHead
                  key={slot}
                  className="w-[120px] text-left pl-2 font-semibold border-b border-r sticky top-0 z-40 bg-muted h-10"
                >
                  {formatDecimalTime(slot)}
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
                      className="hover:bg-transparent h-28 max-h-28 overflow-hidden"
                    >
                      {trackIdx === 0 && (
                        <TableCell
                          rowSpan={tracks.length}
                          className="sticky left-0 z-20 bg-background border-b border-r font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs whitespace-normal break-words p-3 h-28 max-h-28 overflow-hidden"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="leading-tight">
                              {machine.name}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-normal px-2 py-0.5 rounded-full w-fit",
                                machine.status === "Available"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700",
                              )}
                            >
                              {machine.status}
                            </span>
                          </div>
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
                              className="p-1.5 border-b border-r bg-muted/5 align-top h-28 max-h-28 overflow-hidden"
                              colSpan={clampedColSpan}
                            >
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Card
                                    className={cn(
                                      "h-full border shadow-sm rounded-lg p-2 flex flex-col justify-between overflow-hidden transition-all cursor-pointer hover:ring-2 hover:ring-primary/20",
                                      usage.color ||
                                        "bg-blue-500/10 border-blue-500 text-blue-700",
                                      isPending &&
                                        "border-dashed border-2 opacity-80",
                                    )}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black tracking-widest opacity-60 uppercase flex items-center gap-1">
                                          <Hash className="h-1.5 w-1.5" />
                                          PRJ-{usage.projectId.slice(-4)}
                                        </span>
                                        {isPending ? (
                                          <Timer className="h-2.5 w-2.5 text-amber-500" />
                                        ) : (
                                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                        )}
                                      </div>
                                      <span className="font-bold text-xs leading-tight line-clamp-2 whitespace-normal break-words text-left">
                                        {usage.projectAlias}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-1">
                                      <span className="text-[9px] font-semibold whitespace-nowrap px-1 py-0.5 rounded bg-background/50">
                                        {formatDecimalTime(usage.startTime)} -{" "}
                                        {formatDecimalTime(usage.endTime)}
                                      </span>
                                      <Avatar className="h-5 w-5 border border-background ring-1 ring-black/5">
                                        <AvatarFallback className="text-[9px] font-bold bg-background">
                                          {usage.makerName[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
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
                            className="group relative p-2 border-b border-r h-28 max-h-28 overflow-hidden transition-colors hover:bg-muted/10"
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
      <div className="md:hidden flex-1 overflow-y-auto space-y-6 pb-6">
        {machines.map((machine) => {
          const machineUsages = usages
            .filter((u) => u.machineId === machine.id)
            .sort((a, b) => a.startTime - b.startTime);

          return (
            <div key={machine.id} className="space-y-3">
              <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-sm">{machine.name}</h3>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 border-dashed border-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <AddUsageDialog machine={machine} />
                </Dialog>
              </div>

              <div className="grid gap-3">
                {machineUsages.length > 0 ? (
                  machineUsages.map((usage) => (
                    <Dialog key={usage.id}>
                      <DialogTrigger asChild>
                        <Card
                          className={cn(
                            "p-4 border shadow-none rounded-xl transition-all cursor-pointer active:scale-[0.98]",
                            usage.color ||
                              "bg-blue-500/10 border-blue-500 text-blue-700",
                            usage.projectStatus === "pending" &&
                              "border-dashed border-2 opacity-90",
                          )}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase opacity-60 text-left">
                                  ID PRJ-{usage.projectId.slice(-4)}
                                </span>
                                {usage.projectStatus === "pending" && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 flex items-center gap-1">
                                    <Timer className="h-2.5 w-2.5" />
                                    PENDING
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-sm leading-tight text-left">
                                {usage.projectAlias}
                              </h4>
                            </div>
                            <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                              <AvatarFallback className="text-[10px] font-bold bg-background">
                                {usage.makerName[0]}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex flex-wrap gap-3 mt-auto">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <Clock className="h-3.5 w-3.5 opacity-60" />
                              <span>
                                {formatDecimalTime(usage.startTime)} -{" "}
                                {formatDecimalTime(usage.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <User className="h-3.5 w-3.5 opacity-60" />
                              <span>{usage.makerName}</span>
                            </div>
                          </div>
                        </Card>
                      </DialogTrigger>
                      <UsageDetailsDialog usage={usage} machine={machine} />
                    </Dialog>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-muted bg-muted/5">
                    <p className="text-xs font-medium text-muted-foreground">
                      No usage records for today
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
