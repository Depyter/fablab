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
  Calendar as CalendarIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageTable, type Machine, type MachineUsage } from "./usage-table";
import {
  ResourceStatus,
  ServiceStatus,
  ProjectStatusType,
} from "@convex/constants";
import { STATUS_STYLES } from "@/components/projects/project-card";

function getSnappedDecimalHours(ms: number, ceil = false) {
  const d = new Date(ms);
  const decimal = d.getHours() + d.getMinutes() / 60;
  return ceil ? Math.ceil(decimal * 2) / 2 : Math.floor(decimal * 2) / 2;
}

export function ProjectCalendarView() {
  const [date, setDate] = React.useState<Date>(() => startOfToday());

  const role = useQuery(api.users.getRole, {});
  const isClient = role === "client";
  const isAdminOrMaker = role === "admin" || role === "maker";

  const [selectedTab, setSelectedTab] = React.useState<
    "resources" | "services"
  >("resources");
  const activeTab = isClient ? "services" : selectedTab;

  const services = useQuery(api.services.query.getServices) || [];
  const resources =
    useQuery(api.resource.query.getResources, isAdminOrMaker ? {} : "skip") ||
    [];
  const bookings =
    useQuery(api.resource.query.getBookings, {
      date: startOfDay(date).getTime(),
    }) || [];

  const handlePrevDay = () => setDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setDate((prev) => addDays(prev, 1));
  const handleToday = () => setDate(startOfToday());

  const resourceMachines: Machine[] = resources.map((r) => ({
    id: r._id,
    name: r.name,
    status:
      r.status === ResourceStatus.UNAVAILABLE
        ? ResourceStatus.UNAVAILABLE
        : ResourceStatus.AVAILABLE,
    description: r.description || `${r.category} resource`,
  }));

  const resourceUsages: MachineUsage[] = bookings
    .filter((b) => b.resource)
    .map((b) => {
      const p = b.project;
      return {
        id: b._id,
        machineId: b.resource!._id,
        projectId: p?._id || "",
        projectAlias: p?.name || "Unknown Project",
        projectStatus: (p?.status || "pending") as ProjectStatusType,
        makerName: b.maker?.name || "Unassigned",
        date: b.startTime,
        startTime: getSnappedDecimalHours(b.startTime, false),
        endTime: getSnappedDecimalHours(b.endTime, true),
        color:
          STATUS_STYLES[p?.status || "pending"]?.badge ||
          "bg-blue-500/10 border-blue-500 text-blue-700",
      };
    });

  const serviceMachines: Machine[] = services.map((s) => ({
    id: s._id,
    name: s.name,
    status:
      s.status === ServiceStatus.UNAVAILABLE
        ? ResourceStatus.UNAVAILABLE
        : ResourceStatus.AVAILABLE,
    description: "Service Booking Queue",
  }));

  const serviceUsages: MachineUsage[] = bookings
    .filter((b) => b.service)
    .map((b) => {
      const p = b.project;
      return {
        id: b._id,
        machineId: b.service!._id,
        projectId: p?._id || "",
        projectAlias: p?.name || "Unknown Project",
        projectStatus: (p?.status || "pending") as ProjectStatusType,
        makerName: b.maker?.name || "Unknown Maker",
        date: b.startTime,
        startTime: getSnappedDecimalHours(b.startTime, false),
        endTime: getSnappedDecimalHours(b.endTime, true),
        color:
          STATUS_STYLES[p?.status || "pending"]?.badge ||
          "bg-purple-500/10 border-purple-500 text-purple-700",
      };
    });

  const filteredResourceUsages = resourceUsages.filter((u) =>
    isSameDay(new Date(u.date), date),
  );

  const filteredServiceUsages = serviceUsages.filter((u) =>
    isSameDay(new Date(u.date), date),
  );

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "resources" || value === "services") {
            setSelectedTab(value);
          }
        }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Single combined toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
          {/* Date navigation */}
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
            className="font-semibold text-sm h-8 px-3"
            onClick={handleToday}
          >
            Today
          </Button>

          <div className="h-4 w-px bg-border" />

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
                {date ? (
                  `${format(date, "EEE, MMM dd")} (PST)`
                ) : (
                  <span>Pick a date (PST)</span>
                )}
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

          <div className="h-4 w-px bg-border" />

          {/* Tab switcher inline */}
          <TabsList className="h-8">
            {isAdminOrMaker && (
              <TabsTrigger value="resources" className="text-xs h-7 px-3">
                Machine Schedule
              </TabsTrigger>
            )}
            <TabsTrigger value="services" className="text-xs h-7 px-3">
              Service Bookings
            </TabsTrigger>
          </TabsList>

          {/* Spacer */}
          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">
              {format(new Date(), "hh:mm a")}
            </span>
            <div className="h-3 w-px bg-border" />
            <span className="font-semibold">
              {
                new Set(
                  [
                    ...(isAdminOrMaker
                      ? filteredResourceUsages.map((u) => u.projectId)
                      : []),
                    ...filteredServiceUsages.map((u) => u.projectId),
                  ].filter(Boolean),
                ).size
              }
            </span>
            <span className="text-muted-foreground">
              {new Set(
                [
                  ...(isAdminOrMaker
                    ? filteredResourceUsages.map((u) => u.projectId)
                    : []),
                  ...filteredServiceUsages.map((u) => u.projectId),
                ].filter(Boolean),
              ).size === 1
                ? "project"
                : "projects"}{" "}
              today
            </span>
          </div>
        </div>

        {/* Table content */}
        {isAdminOrMaker && (
          <TabsContent
            value="resources"
            className="flex-1 flex-col min-h-0 data-[state=active]:flex m-0 p-0"
          >
            <UsageTable
              machines={resourceMachines}
              usages={filteredResourceUsages}
            />
          </TabsContent>
        )}

        <TabsContent
          value="services"
          className="flex-1 flex-col min-h-0 data-[state=active]:flex m-0 p-0"
        >
          <UsageTable
            machines={serviceMachines}
            usages={filteredServiceUsages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
