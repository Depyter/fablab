"use client";

import * as React from "react";
import { startOfToday } from "date-fns";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Preloaded } from "convex/react";
import { useQuery } from "convex/react";

import {
  buildBookingCalendarViewModels,
  type CalendarBookingItem,
  type CalendarTab,
  type CalendarViewMode,
} from "@/lib/calendar";
import { getLabDayBounds } from "@/lib/lab-time";
import { getVisibleRange, shiftDate } from "./calendar-state";

export function useBookingCalendarController({
  preloadedFrame,
}: {
  preloadedFrame: Preloaded<typeof api.calendar.query.getCalendarFrame>;
}) {
  const [date, setDate] = React.useState<Date>(() => startOfToday());
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("day");
  const [activeTab, setActiveTab] = React.useState<CalendarTab>("services");
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<Id<"projects"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const frame = usePreloadedAuthQuery(preloadedFrame);
  const isAdminOrMaker = frame?.role === "admin" || frame?.role === "maker";
  const visibleRange = getVisibleRange(date, viewMode);
  const firstDay = visibleRange.days[0];
  const lastDay = visibleRange.days[visibleRange.days.length - 1];
  const { start: queryStart } = getLabDayBounds(firstDay);
  const { endExclusive: queryEnd } = getLabDayBounds(lastDay);
  const queryRange = {
    startTime: queryStart.getTime(),
    endTime: queryEnd.getTime(),
  };

  const bookings = useQuery(api.calendar.query.getCalendarBookings, {
    startTime: queryRange.startTime,
    endTime: queryRange.endTime,
  });
  const bookingsLoading = bookings === undefined;
  const bookingItems: CalendarBookingItem[] = bookings ?? [];
  const totalBookings = bookingItems.length;
  const totalProjects = new Set(
    bookingItems.flatMap((booking) =>
      booking.projectId ? [booking.projectId] : [],
    ),
  ).size;

  const dayBounds = getLabDayBounds(date);
  const dayRange = {
    startTime: dayBounds.start.getTime(),
    endTime: dayBounds.endExclusive.getTime(),
  };
  const viewModels = buildBookingCalendarViewModels({
    frame: frame ?? null,
    bookings: bookingItems,
    dayRange,
    activeTab,
    viewMode,
  });

  function handlePrevPeriod() {
    setDate((prev) => shiftDate(prev, viewMode, -1));
  }

  function handleNextPeriod() {
    setDate((prev) => shiftDate(prev, viewMode, 1));
  }

  function handleReset() {
    setDate(startOfToday());
  }

  function handleSelectDate(nextDate: Date | undefined) {
    if (nextDate) {
      setDate(nextDate);
    }
  }

  function handleOpenProjectDetails(projectId: Id<"projects">) {
    setSelectedProjectId(projectId);
    setIsDetailsOpen(true);
  }

  function handleDetailsOpenChange(open: boolean) {
    setIsDetailsOpen(open);

    if (!open) {
      setSelectedProjectId(null);
    }
  }

  return {
    date,
    setDate: handleSelectDate,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    visibleRange,
    frame,
    isAdminOrMaker,
    bookingsLoading,
    bookingItems,
    totalBookings,
    totalProjects,
    selectedProjectId,
    isDetailsOpen,
    handlePrevPeriod,
    handleNextPeriod,
    handleReset,
    handleOpenProjectDetails,
    handleDetailsOpenChange,
    ...viewModels,
  };
}
