"use client";

import * as React from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Preloaded } from "convex/react";

import {
  DAY_END,
  DAY_START,
  UsageTable,
  type Machine,
  type MachineUsage,
} from "./usage-table";
import type { CalendarViewMode, CalendarVisibleRange } from "./calendar-state";
import {
  CalendarRangeView,
  type CalendarRangeEvent,
} from "./calendar-range-view";
import {
  ResourceStatus,
  ServiceStatus,
  ProjectStatusType,
} from "@convex/constants";
import { STATUS_STYLES } from "@/components/projects/project-card";
import { getLabDayBounds, getSnappedLabDecimalHour } from "@/lib/lab-time";
import { clipTimeRange } from "@/lib/time-range";

export interface CalendarBookingItem {
  _id: Id<"resourceUsage">;
  startTime: number;
  endTime: number;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: string;
  makerName: string;
  serviceId: Id<"services">;
  resourceId: Id<"resources"> | null;
}

function getResourceGroup(category: string | null) {
  if (!category) return undefined;

  return category.charAt(0) + category.slice(1).toLowerCase();
}

function getServiceGroup(type: string) {
  return type === "WORKSHOP" ? "Workshops" : "Fabrication";
}

function getBookingColor(status: ProjectStatusType) {
  return (
    STATUS_STYLES[status]?.badge ||
    "bg-blue-500/10 border-blue-500 text-blue-700"
  );
}

export const BookingCalendarView = React.memo(function BookingCalendarView({
  preloadedFrame,
  date,
  viewMode,
  visibleRange,
  onOpenProjectDetails,
  activeTab,
  bookings: bookingItems,
  bookingsLoading,
}: {
  preloadedFrame: Preloaded<typeof api.calendar.query.getCalendarFrame>;
  date: Date;
  viewMode: CalendarViewMode;
  visibleRange: CalendarVisibleRange;
  onOpenProjectDetails?: (projectId: Id<"projects">) => void;
  activeTab: "resources" | "services";
  bookings: CalendarBookingItem[];
  bookingsLoading: boolean;
}) {
  const frame = usePreloadedAuthQuery(preloadedFrame);
  const isAdminOrMaker = frame?.role === "admin" || frame?.role === "maker";

  const resourceMachines = React.useMemo<Machine[]>(
    () =>
      (frame?.resources ?? []).map((resource) => ({
        id: resource._id,
        name: resource.name,
        status:
          resource.status === ResourceStatus.UNAVAILABLE
            ? ResourceStatus.UNAVAILABLE
            : ResourceStatus.AVAILABLE,
        description:
          resource.description ||
          `${resource.category?.toLowerCase()} resource`,
        group: getResourceGroup(resource.category),
      })),
    [frame?.resources],
  );

  const serviceMachines = React.useMemo<Machine[]>(
    () =>
      (frame?.services ?? []).map((service) => ({
        id: service._id,
        name: service.name,
        href: `/services/${service.name}`,
        status:
          service.status === ServiceStatus.UNAVAILABLE
            ? ResourceStatus.UNAVAILABLE
            : ResourceStatus.AVAILABLE,
        description: "Service Booking Queue",
        group: getServiceGroup(service.serviceCategoryType),
      })),
    [frame?.services],
  );

  const servicesById = React.useMemo(
    () =>
      new Map((frame?.services ?? []).map((service) => [service._id, service])),
    [frame?.services],
  );
  const dayBounds = React.useMemo(() => getLabDayBounds(date), [date]);

  const resourcesById = React.useMemo(
    () =>
      new Map(
        (frame?.resources ?? []).map((resource) => [resource._id, resource]),
      ),
    [frame?.resources],
  );

  const normalizeDayUsageWindow = React.useCallback(
    (booking: CalendarBookingItem) => {
      const clippedRange = clipTimeRange(
        booking.startTime,
        booking.endTime,
        dayBounds.start.getTime(),
        dayBounds.endExclusive.getTime(),
      );

      if (!clippedRange) return null;

      const startTime = Math.max(
        getSnappedLabDecimalHour(clippedRange.startTime, false),
        DAY_START,
      );
      const endTime = Math.min(
        getSnappedLabDecimalHour(clippedRange.endTime, true),
        DAY_END,
      );

      if (endTime <= startTime) return null;

      return {
        startTime,
        endTime,
      };
    },
    [dayBounds.endExclusive, dayBounds.start],
  );

  const resourceUsages = React.useMemo<MachineUsage[]>(
    () =>
      viewMode !== "day"
        ? []
        : bookingItems
            .filter((booking) => booking.resourceId !== null)
            .flatMap((booking) => {
              const window = normalizeDayUsageWindow(booking);

              if (!window) return [];

              return [
                {
                  id: booking._id,
                  machineId: booking.resourceId!,
                  projectId: booking.projectId,
                  projectAlias: booking.projectAlias,
                  projectStatus: booking.projectStatus as ProjectStatusType,
                  makerName: booking.makerName,
                  date: booking.startTime,
                  startTime: window.startTime,
                  endTime: window.endTime,
                  color: getBookingColor(
                    booking.projectStatus as ProjectStatusType,
                  ),
                },
              ];
            }),
    [bookingItems, normalizeDayUsageWindow, viewMode],
  );

  const serviceUsages = React.useMemo<MachineUsage[]>(
    () =>
      viewMode !== "day"
        ? []
        : bookingItems.flatMap((booking) => {
            const window = normalizeDayUsageWindow(booking);

            if (!window) return [];

            return [
              {
                id: booking._id,
                machineId: booking.serviceId,
                projectId: booking.projectId,
                projectAlias: booking.projectAlias,
                projectStatus: booking.projectStatus as ProjectStatusType,
                makerName: booking.makerName,
                date: booking.startTime,
                startTime: window.startTime,
                endTime: window.endTime,
                color:
                  STATUS_STYLES[booking.projectStatus as ProjectStatusType]
                    ?.badge ||
                  "bg-purple-500/10 border-purple-500 text-purple-700",
              },
            ];
          }),
    [bookingItems, normalizeDayUsageWindow, viewMode],
  );

  const rangeEvents = React.useMemo<CalendarRangeEvent[]>(() => {
    if (viewMode === "day") return [];

    const bookings =
      activeTab === "resources"
        ? bookingItems.filter((booking) => booking.resourceId !== null)
        : bookingItems;

    return bookings.map((booking) => ({
      id: booking._id,
      projectId: booking.projectId,
      projectAlias: booking.projectAlias,
      projectStatus: booking.projectStatus as ProjectStatusType,
      startTime: booking.startTime,
      endTime: booking.endTime,
      color: getBookingColor(booking.projectStatus as ProjectStatusType),
      secondaryLabel:
        activeTab === "resources"
          ? (booking.resourceId
              ? resourcesById.get(booking.resourceId)?.name
              : null) || "Machine"
          : servicesById.get(booking.serviceId)?.name || "Service",
    }));
  }, [activeTab, bookingItems, resourcesById, servicesById, viewMode]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeTab === "services" ? (
          viewMode === "day" ? (
            <UsageTable
              machines={serviceMachines}
              usages={serviceUsages}
              onOpenProjectDetails={onOpenProjectDetails}
              leadingColumnLabel="SERVICES"
            />
          ) : (
            <CalendarRangeView
              anchorDate={date}
              days={visibleRange.days}
              events={rangeEvents}
              viewMode={viewMode}
              isLoading={bookingsLoading}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          )
        ) : isAdminOrMaker ? (
          viewMode === "day" ? (
            <UsageTable
              machines={resourceMachines}
              usages={resourceUsages}
              onOpenProjectDetails={onOpenProjectDetails}
              leadingColumnLabel="RESOURCES"
            />
          ) : (
            <CalendarRangeView
              anchorDate={date}
              days={visibleRange.days}
              events={rangeEvents}
              viewMode={viewMode}
              isLoading={bookingsLoading}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          )
        ) : null}
      </div>
    </div>
  );
});

BookingCalendarView.displayName = "BookingCalendarView";
