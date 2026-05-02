"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { format, addDays, subDays, startOfToday, startOfDay } from "date-fns";
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
import { ProjectDetails } from "@/components/projects/project-details";
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

export function BookingCalendarView() {
  const [date, setDate] = React.useState<Date>(() => startOfToday());
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<Id<"projects"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const role = useQuery(api.users.getRole, {});
  const isClient = role === "client";
  const isAdminOrMaker = role === "admin" || role === "maker";

  const [selectedTab, setSelectedTab] = React.useState<
    "resources" | "services"
  >("services");
  const activeTab = isClient ? "services" : selectedTab;

  const services = useQuery(api.services.query.getServices);
  const resources = useQuery(
    api.resource.query.getResources,
    isAdminOrMaker ? {} : "skip",
  );
  const bookings = useQuery(api.resource.query.getBookings, {
    date: startOfDay(date).getTime(),
  });

  const handlePrevDay = () => setDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setDate((prev) => addDays(prev, 1));
  const handleToday = () => setDate(startOfToday());

  const handleOpenProjectDetails = React.useCallback(
    (projectId: Id<"projects">) => {
      setSelectedProjectId(projectId);
      setIsDetailsOpen(true);
    },
    [],
  );

  const handleDetailsOpenChange = React.useCallback((open: boolean) => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedProjectId(null);
    }
  }, []);

  const resourceMachines = React.useMemo<Machine[]>(
    () =>
      (resources ?? []).map((resource) => ({
        id: resource._id,
        name: resource.name,
        status:
          resource.status === ResourceStatus.UNAVAILABLE
            ? ResourceStatus.UNAVAILABLE
            : ResourceStatus.AVAILABLE,
        description: resource.description || `${resource.category} resource`,
      })),
    [resources],
  );

  const resourceUsages = React.useMemo<MachineUsage[]>(
    () =>
      (bookings ?? [])
        .filter((booking) => booking.resource)
        .map((booking) => {
          const project = booking.project;
          return {
            id: booking._id,
            machineId: booking.resource!._id,
            projectId: project?._id || null,
            projectAlias: project?.name || "Unknown Project",
            projectStatus: (project?.status || "pending") as ProjectStatusType,
            makerName: booking.maker?.name || "Unassigned",
            date: booking.startTime,
            startTime: getSnappedDecimalHours(booking.startTime, false),
            endTime: getSnappedDecimalHours(booking.endTime, true),
            color:
              STATUS_STYLES[project?.status || "pending"]?.badge ||
              "bg-blue-500/10 border-blue-500 text-blue-700",
          };
        }),
    [bookings],
  );

  const serviceMachines = React.useMemo<Machine[]>(
    () =>
      (services ?? []).map((service) => ({
        id: service._id,
        name: service.name,
        status:
          service.status === ServiceStatus.UNAVAILABLE
            ? ResourceStatus.UNAVAILABLE
            : ResourceStatus.AVAILABLE,
        description: "Service Booking Queue",
      })),
    [services],
  );

  const serviceUsages = React.useMemo<MachineUsage[]>(
    () =>
      (bookings ?? [])
        .filter((booking) => booking.service)
        .map((booking) => {
          const project = booking.project;
          return {
            id: booking._id,
            machineId: booking.service!._id,
            projectId: project?._id || null,
            projectAlias: project?.name || "Unknown Project",
            projectStatus: (project?.status || "pending") as ProjectStatusType,
            makerName: booking.maker?.name || "Unknown Maker",
            date: booking.startTime,
            startTime: getSnappedDecimalHours(booking.startTime, false),
            endTime: getSnappedDecimalHours(booking.endTime, true),
            color:
              STATUS_STYLES[project?.status || "pending"]?.badge ||
              "bg-purple-500/10 border-purple-500 text-purple-700",
          };
        }),
    [bookings],
  );

  const totalProjects = React.useMemo(
    () =>
      new Set(
        [
          ...(isAdminOrMaker
            ? resourceUsages.map((usage) => usage.projectId)
            : []),
          ...serviceUsages.map((usage) => usage.projectId),
        ].filter(Boolean),
      ).size,
    [isAdminOrMaker, resourceUsages, serviceUsages],
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "resources" || value === "services") {
              setSelectedTab(value);
            }
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2 shrink-0 flex-wrap">
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

            <TabsList className="h-8">
              <TabsTrigger value="services" className="text-xs h-7 px-3">
                Service Bookings
              </TabsTrigger>
              {isAdminOrMaker && (
                <TabsTrigger value="resources" className="text-xs h-7 px-3">
                  Machine Schedule
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1" />

            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">
                {format(new Date(), "hh:mm a")}
              </span>
              <div className="h-3 w-px bg-border" />
              <span className="font-semibold">{totalProjects}</span>
              <span className="text-muted-foreground">
                {totalProjects === 1 ? "project" : "projects"} today
              </span>
            </div>
          </div>

          <TabsContent
            value="services"
            className="flex-1 flex-col min-h-0 data-[state=active]:flex m-0 p-0"
          >
            <UsageTable
              machines={serviceMachines}
              usages={serviceUsages}
              onOpenProjectDetails={handleOpenProjectDetails}
            />
          </TabsContent>

          {isAdminOrMaker && (
            <TabsContent
              value="resources"
              className="flex-1 flex-col min-h-0 data-[state=active]:flex m-0 p-0"
            >
              <UsageTable
                machines={resourceMachines}
                usages={resourceUsages}
                onOpenProjectDetails={handleOpenProjectDetails}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ProjectDetails
        projectId={selectedProjectId}
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        hideTrigger
      />
    </>
  );
}
