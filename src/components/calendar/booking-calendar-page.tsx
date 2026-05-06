"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ViewHeader,
  ViewHeaderMain,
  ViewHeaderRow,
} from "@/components/ui/view-header";
import {
  CalendarNavigation,
  CalendarTabSwitcher,
  CalendarViewSwitcher,
} from "./booking-calendar-toolbar";
import { BookingCalendarShell } from "./booking-calendar-shell";
import {
  BookingCalendarProvider,
  useBookingCalendarController,
} from "./use-booking-calendar-controller";

function BookingCalendarPageHeader() {
  const controller = useBookingCalendarController();

  return (
    <ViewHeader>
      <ViewHeaderRow>
        <SidebarTrigger className="-ml-1 shrink-0 text-sidebar-foreground/50 transition-colors hover:text-primary" />
        <ViewHeaderMain>
          <CalendarNavigation
            date={controller.date}
            visibleRange={controller.visibleRange}
            onSelectDate={controller.setDate}
            onPrevPeriod={controller.handlePrevPeriod}
            onNextPeriod={controller.handleNextPeriod}
            onReset={controller.handleReset}
            className="rounded-md border bg-background p-0.5"
          />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <CalendarViewSwitcher
              viewMode={controller.viewMode}
              onViewModeChange={controller.setViewMode}
            />
            {controller.isAdminOrMaker ? (
              <CalendarTabSwitcher
                activeTab={controller.activeTab}
                onTabChange={controller.setActiveTab}
              />
            ) : null}
          </div>
        </ViewHeaderMain>
      </ViewHeaderRow>
    </ViewHeader>
  );
}

export function BookingCalendarPage() {
  return (
    <BookingCalendarProvider>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
        <BookingCalendarPageHeader />
        <BookingCalendarShell />
      </div>
    </BookingCalendarProvider>
  );
}
