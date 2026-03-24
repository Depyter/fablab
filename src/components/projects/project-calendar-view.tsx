"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  format,
  addDays,
  subDays,
  startOfToday,
  isSameDay,
  startOfDay,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageTable, type Machine, type MachineUsage } from "./usage-table";

type ViewFilter = "all" | "confirmed";

function getSnappedDecimalHours(ms: number, ceil = false) {
  const d = new Date(ms);
  const decimal = d.getHours() + d.getMinutes() / 60;
  return ceil ? Math.ceil(decimal * 2) / 2 : Math.floor(decimal * 2) / 2;
}

export function ProjectCalendarView() {
  const [date, setDate] = React.useState<Date>(startOfToday());
  const [viewFilter, setViewFilter] = React.useState<ViewFilter>("all");
  const [activeTab, setActiveTab] = React.useState<string>("resources");

  const services = useQuery(api.services.query.getServices) || [];
  const resources = useQuery(api.resource.query.getResources) || [];
  const bookings =
    useQuery(api.resource.query.getBookings, {
      date: startOfDay(date).getTime(),
    }) || [];

  const handlePrevDay = () => setDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setDate((prev) => addDays(prev, 1));
  const handleToday = () => setDate(startOfToday());

  // ----- Resources Table Data (Machine Schedule) -----
  const { resourceMachines, resourceUsages } = React.useMemo(() => {
    const machines: Machine[] = resources.map((r) => ({
      id: r._id,
      name: r.name,
      status: r.status === "Unavailable" ? "Unavailable" : "Available",
      description: r.description || `${r.category} resource`,
    }));

    const usages: MachineUsage[] = bookings
      .filter((b) => b.resource)
      .map((b) => ({
        id: b._id,
        machineId: b.resource!._id,
        projectId: b.project?._id || "",
        projectAlias: b.project?.name || "Unknown Project",
        projectStatus: b.project?.status || "pending",
        makerName: b.maker?.name || "Unknown Maker",
        date: b.date,
        startTime: getSnappedDecimalHours(b.startTime, false),
        endTime: getSnappedDecimalHours(b.endTime, true),
        color: "bg-blue-500/10 border-blue-500 text-blue-700",
      }));

    return { resourceMachines: machines, resourceUsages: usages };
  }, [resources, bookings]);

  // ----- Services Table Data (Project Booking Times) -----
  const { serviceMachines, serviceUsages } = React.useMemo(() => {
    const machines: Machine[] = services.map((s) => ({
      id: s._id,
      name: s.name,
      status: s.status === "Unavailable" ? "Unavailable" : "Available",
      description: "Service Booking Queue",
    }));

    const usages: MachineUsage[] = bookings
      .filter((b) => b.service)
      .map((b) => ({
        id: b._id,
        machineId: b.service!._id,
        projectId: b.project?._id || "",
        projectAlias: b.project?.name || "Unknown Project",
        projectStatus: b.project?.status || "pending",
        makerName: b.maker?.name || "Unknown Maker",
        date: b.date,
        startTime: getSnappedDecimalHours(b.startTime, false),
        endTime: getSnappedDecimalHours(b.endTime, true),
        color: "bg-purple-500/10 border-purple-500 text-purple-700",
      }));

    return { serviceMachines: machines, serviceUsages: usages };
  }, [services, bookings]);

  // Apply Date and Status filters
  const filteredResourceUsages = React.useMemo(() => {
    return resourceUsages.filter((u) => {
      const isDateMatch = isSameDay(new Date(u.date), date);
      return (
        isDateMatch && (viewFilter === "all" || u.projectStatus === "approved")
      );
    });
  }, [resourceUsages, date, viewFilter]);

  const filteredServiceUsages = React.useMemo(() => {
    return serviceUsages.filter((u) => {
      const isDateMatch = isSameDay(new Date(u.date), date);
      return (
        isDateMatch && (viewFilter === "all" || u.projectStatus === "approved")
      );
    });
  }, [serviceUsages, date, viewFilter]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machine Usage</h1>
          <p className="text-muted-foreground text-sm">
            Monitor and schedule machine time across projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-50"></div>
          <Button variant="default" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Usage
          </Button>
        </div>
      </div>

      {/* Navigation & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b bg-muted/30 gap-4 shrink-0">
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

      <div className="flex-1 flex flex-col overflow-hidden p-6 pt-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2 shrink-0">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="resources">Machine Schedule</TabsTrigger>
              <TabsTrigger value="services">Service Bookings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="resources"
            className="flex-1 flex-col min-h-0 data-[state=active]:flex m-0 p-0 pt-2"
          >
            <UsageTable
              machines={resourceMachines}
              usages={filteredResourceUsages}
            />
          </TabsContent>

          <TabsContent
            value="services"
            className="flex-1 flex-col min-h-0 data-[state=active]:flex m-0 p-0 pt-2"
          >
            <UsageTable
              machines={serviceMachines}
              usages={filteredServiceUsages}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
