"use client";

import * as React from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Preloaded } from "convex/react";

import { UsageTable, type Machine, type MachineUsage } from "./usage-table";
import type { CalendarVisibleRange } from "./calendar-state";
import { CalendarRangeView } from "./calendar-range-view";
import { ResourceStatus, ServiceStatus } from "@convex/constants";
import {
  getCalendarBookingColor,
  getCalendarProjectStatus,
  getCalendarResourceGroupLabel,
  getCalendarServiceGroupLabel,
  normalizeCalendarBookingToDayWindow,
  type CalendarBookingItem,
  type CalendarRangeEvent,
  type CalendarTab,
  type CalendarViewMode,
} from "@/lib/calendar";
import { getLabDayBounds } from "@/lib/lab-time";

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
  activeTab: CalendarTab;
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
        group: getCalendarResourceGroupLabel(resource.category),
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
        group: getCalendarServiceGroupLabel(service.serviceCategoryType),
      })),
    [frame?.services],
  );

  const servicesById = React.useMemo(
    () =>
      new Map((frame?.services ?? []).map((service) => [service._id, service])),
    [frame?.services],
  );
  const dayBounds = React.useMemo(() => getLabDayBounds(date), [date]);
  const dayRange = React.useMemo(
    () => ({
      startTime: dayBounds.start.getTime(),
      endTime: dayBounds.endExclusive.getTime(),
    }),
    [dayBounds.endExclusive, dayBounds.start],
  );

  const resourcesById = React.useMemo(
    () =>
      new Map(
        (frame?.resources ?? []).map((resource) => [resource._id, resource]),
      ),
    [frame?.resources],
  );

  const normalizeDayUsageWindow = React.useCallback(
    (booking: CalendarBookingItem) =>
      normalizeCalendarBookingToDayWindow(booking, dayRange),
    [dayRange],
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
              const projectStatus = getCalendarProjectStatus(
                booking.projectStatus,
              );

              return [
                {
                  id: booking._id,
                  machineId: booking.resourceId!,
                  projectId: booking.projectId,
                  projectAlias: booking.projectAlias,
                  projectStatus,
                  makerName: booking.makerName,
                  date: booking.startTime,
                  startTime: window.startTime,
                  endTime: window.endTime,
                  color: getCalendarBookingColor(projectStatus),
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
            const projectStatus = getCalendarProjectStatus(
              booking.projectStatus,
            );

            return [
              {
                id: booking._id,
                machineId: booking.serviceId,
                projectId: booking.projectId,
                projectAlias: booking.projectAlias,
                projectStatus,
                makerName: booking.makerName,
                date: booking.startTime,
                startTime: window.startTime,
                endTime: window.endTime,
                color: getCalendarBookingColor(
                  projectStatus,
                  "bg-purple-500/10 border-purple-500 text-purple-700",
                ),
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

    return bookings.map((booking) => {
      const projectStatus = getCalendarProjectStatus(booking.projectStatus);

      return {
        id: booking._id,
        projectId: booking.projectId,
        projectAlias: booking.projectAlias,
        projectStatus,
        startTime: booking.startTime,
        endTime: booking.endTime,
        color: getCalendarBookingColor(projectStatus),
        secondaryLabel:
          activeTab === "resources"
            ? (booking.resourceId
                ? resourcesById.get(booking.resourceId)?.name
                : null) || "Machine"
            : servicesById.get(booking.serviceId)?.name || "Service",
      };
    });
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
