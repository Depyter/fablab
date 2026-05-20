"use client";

import { LayoutGrid, Users } from "lucide-react";
import { SelectItem } from "@/components/ui/select";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import {
  BrandSelect,
  BrandSegmentedControl,
} from "@/components/brand/primitives";
import { CalendarNavigation } from "./booking-calendar-toolbar";
import { BookingCalendarShell } from "./booking-calendar-shell";
import {
  BookingCalendarProvider,
  useBookingCalendarController,
} from "./use-booking-calendar-controller";

const TAB_OPTIONS = [
  {
    value: "services" as const,
    label: "Services",
    icon: <LayoutGrid className="size-4" />,
  },
  {
    value: "resources" as const,
    label: "Machines",
    icon: <Users className="size-4" />,
  },
];

function BookingCalendarPageHeader() {
  const controller = useBookingCalendarController();

  return (
    <DataViewPageHeader>
      <CalendarNavigation
        date={controller.date}
        visibleRange={controller.visibleRange}
        onSelectDate={controller.setDate}
        onPrevPeriod={controller.handlePrevPeriod}
        onNextPeriod={controller.handleNextPeriod}
        onReset={controller.handleReset}
        className="border-2 border-black bg-white p-0.5"
      />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <BrandSelect
          value={controller.viewMode}
          onValueChange={(value) =>
            controller.setViewMode(value as "day" | "week" | "month")
          }
          placeholder="View"
          triggerClassName="rounded-none shadow-none"
        >
          <SelectItem value="day">Day</SelectItem>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
        </BrandSelect>
        {controller.isAdminOrMaker ? (
          <BrandSegmentedControl
            options={TAB_OPTIONS}
            value={controller.activeTab}
            onChange={controller.setActiveTab}
            hideLabels
          />
        ) : null}
      </div>
    </DataViewPageHeader>
  );
}

export function BookingCalendarPage() {
  return (
    <BookingCalendarProvider>
      <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
        <BookingCalendarPageHeader />
        <BookingCalendarShell />
      </div>
    </BookingCalendarProvider>
  );
}
