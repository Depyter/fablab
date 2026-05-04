"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { api } from "@convex/_generated/api";
import type { Preloaded } from "convex/react";
import { ProjectDetails } from "@/components/projects/project-details";
import { CalendarContentLoadingState } from "./calendar-loading";
import { BookingCalendarToolbar } from "./booking-calendar-toolbar";
import { useBookingCalendarController } from "./use-booking-calendar-controller";

const BookingCalendarClient = dynamic(
  () =>
    import("./booking-calendar-view").then(
      (module) => module.BookingCalendarView,
    ),
  {
    loading: () => (
      <CalendarContentLoadingState viewMode="day" activeTab="services" />
    ),
  },
);

export function BookingCalendarShell({
  preloadedFrame,
}: {
  preloadedFrame: Preloaded<typeof api.calendar.query.getCalendarFrame>;
}) {
  const controller = useBookingCalendarController({ preloadedFrame });

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <BookingCalendarToolbar
          date={controller.date}
          viewMode={controller.viewMode}
          activeTab={controller.activeTab}
          visibleRange={controller.visibleRange}
          isAdminOrMaker={controller.isAdminOrMaker}
          bookingsLoading={controller.bookingsLoading}
          totalBookings={controller.totalBookings}
          totalProjects={controller.totalProjects}
          onSelectDate={controller.setDate}
          onPrevPeriod={controller.handlePrevPeriod}
          onNextPeriod={controller.handleNextPeriod}
          onReset={controller.handleReset}
          onViewModeChange={controller.setViewMode}
          onTabChange={controller.setActiveTab}
        />

        <React.Suspense
          fallback={
            <CalendarContentLoadingState
              viewMode={controller.viewMode}
              activeTab={controller.activeTab}
            />
          }
        >
          <BookingCalendarClient
            date={controller.date}
            viewMode={controller.viewMode}
            visibleRange={controller.visibleRange}
            onSelectDay={controller.handleOpenDay}
            onOpenProjectDetails={controller.handleOpenProjectDetails}
            activeTab={controller.activeTab}
            isAdminOrMaker={controller.isAdminOrMaker}
            bookingsLoading={controller.bookingsLoading}
            serviceMachines={controller.serviceMachines}
            resourceMachines={controller.resourceMachines}
            serviceUsages={controller.serviceUsages}
            resourceUsages={controller.resourceUsages}
            rangeEvents={controller.rangeEvents}
          />
        </React.Suspense>
      </div>

      <ProjectDetails
        projectId={controller.selectedProjectId}
        open={controller.isDetailsOpen}
        onOpenChange={controller.handleDetailsOpenChange}
        hideTrigger
      />
    </>
  );
}
