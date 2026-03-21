"use client";

import * as React from "react";
import {
  format,
  addDays,
  subDays,
  startOfToday,
  isSameDay,
  getUnixTime,
  fromUnixTime,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UsageTable,
  type Machine,
  type MachineUsage,
} from "../../../../../../components/scheduling/usage-table/usage-table";

// --- Mock Data Mocking the Joined Convex Query Results ---
// This data structure mimics what query.ts returns: usage joined with project, maker, and machine.

const MOCK_MACHINES: Machine[] = [
  {
    id: "m1",
    name: "Laser Cutter 1",
    status: "Available",
    description: "High-precision CO2 laser",
  },
  {
    id: "m2",
    name: "3D Printer A (Prusa)",
    status: "Available",
    description: "FDM 3D Printer",
  },
  {
    id: "m3",
    name: "CNC Router",
    status: "Available",
    description: "Large format wood router",
  },
  {
    id: "m4",
    name: "Vinyl Cutter",
    status: "Unavailable",
    description: "Roland GS-24",
  },
  {
    id: "m5",
    name: "Electronics Lab",
    status: "Available",
    description: "Soldering and testing station",
  },
];

const TODAY_UNIX = getUnixTime(startOfToday());

const MOCK_QUERY_RESULTS: MachineUsage[] = [
  {
    id: "usage_1",
    machineId: "m1",
    projectId: "proj_1",
    projectAlias: "Enclosure Cut",
    projectStatus: "approved",
    makerName: "Renata Robinson",
    date: TODAY_UNIX,
    startTime: 9,
    endTime: 11,
    color: "bg-blue-500/10 border-blue-500 text-blue-700",
  },
  {
    id: "usage_2",
    machineId: "m1",
    projectId: "proj_pending_1",
    projectAlias: "Experimental Spare Parts",
    projectStatus: "pending",
    makerName: "Renata Robinson",
    date: TODAY_UNIX,
    startTime: 11.5,
    endTime: 12.5,
    color: "bg-amber-500/10 border-amber-500 text-amber-700",
  },
  {
    id: "usage_3",
    machineId: "m2",
    projectId: "proj_2",
    projectAlias: "Prototype v1",
    projectStatus: "approved",
    makerName: "Marcel Doe",
    date: TODAY_UNIX,
    startTime: 10,
    endTime: 14,
    color: "bg-emerald-500/10 border-emerald-500 text-emerald-700",
  },
  {
    id: "usage_4",
    machineId: "m3",
    projectId: "proj_3",
    projectAlias: "Cabinet Parts",
    projectStatus: "approved",
    makerName: "Damar Smith",
    date: TODAY_UNIX,
    startTime: 9,
    endTime: 13.5,
    color: "bg-purple-500/10 border-purple-500 text-purple-700",
  },
  {
    id: "usage_5",
    machineId: "m2",
    projectId: "proj_pending_2",
    projectAlias: "Research Model B",
    projectStatus: "pending",
    makerName: "Anita P",
    date: TODAY_UNIX,
    startTime: 14.5,
    endTime: 16.5,
    color: "bg-rose-500/10 border-rose-500 text-rose-700",
  },
];

type ViewFilter = "all" | "confirmed";

export function ProjectCalendarView() {
  const [date, setDate] = React.useState<Date>(startOfToday());
  const [viewFilter, setViewFilter] = React.useState<ViewFilter>("all");

  const handlePrevDay = () => setDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setDate((prev) => addDays(prev, 1));
  const handleToday = () => setDate(startOfToday());

  const filteredUsages = React.useMemo(() => {
    return MOCK_QUERY_RESULTS.filter((u) => {
      const usageDate = fromUnixTime(u.date);
      const isDateMatch = isSameDay(usageDate, date);
      const isStatusMatch =
        viewFilter === "all" || u.projectStatus === "approved";
      return isDateMatch && isStatusMatch;
    });
  }, [date, viewFilter]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machine Usage</h1>
          <p className="text-muted-foreground text-sm">
            Monitor and schedule machine time across projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-50">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search machines..."
              className="pl-8 w-full h-9"
            />
          </div>
          <Button variant="default" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Usage
          </Button>
        </div>
      </div>

      {/* Navigation & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b bg-muted/30 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            className="font-semibold text-sm h-8"
            onClick={handleToday}
          >
            Today
          </Button>
          <div className="hidden sm:block h-4 w-px bg-border mx-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-8 px-3 text-sm",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "EEE, MMM dd") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" />
              View:
            </span>
            <Select
              value={viewFilter}
              onValueChange={(v) => setViewFilter(v as ViewFilter)}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs font-semibold">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Usages
                </SelectItem>
                <SelectItem value="confirmed" className="text-xs">
                  Confirmed Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-md font-medium px-2 py-0.5 text-[10px]"
            >
              Schedule View
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Usage Table Component */}
      <UsageTable machines={MOCK_MACHINES} usages={filteredUsages} />
    </div>
  );
}
