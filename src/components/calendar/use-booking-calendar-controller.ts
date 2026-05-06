"use client";

import * as React from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  usePathname,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { useQuery } from "convex/react";

import {
  buildBookingCalendarViewModels,
  type CalendarBookingItem,
} from "@/lib/calendar";
import {
  getCurrentTimestamp,
  getLabDayBounds,
  getLabDayKey,
  getLabDayStart,
} from "@/lib/lab-time";
import { useProfile } from "@/components/sidebar/profile-context";
import {
  getCalendarSelectedDate,
  getVisibleRange,
  resolveCalendarTab,
  resolveCalendarViewMode,
  shiftDate,
} from "./calendar-state";

function useCreateBookingCalendarController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profile = useProfile();
  const isAdminOrMaker = profile?.role === "admin" || profile?.role === "maker";
  const initialState = React.useMemo(
    () => ({
      date: getCalendarSelectedDate(
        searchParams.get("date"),
        getCurrentTimestamp(),
      ),
      viewMode: resolveCalendarViewMode(searchParams.get("view")),
      activeTab: resolveCalendarTab(searchParams.get("tab"), isAdminOrMaker),
    }),
    [isAdminOrMaker, searchParams],
  );
  const [date, setDate] = React.useState(initialState.date);
  const [viewMode, setViewMode] = React.useState(initialState.viewMode);
  const [activeTab, setActiveTab] = React.useState(initialState.activeTab);

  const [selectedProjectId, setSelectedProjectId] =
    React.useState<Id<"projects"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const syncFromSearch = React.useCallback(
    (nextSearch: URLSearchParams | ReadonlyURLSearchParams) => {
      const nextDate = getCalendarSelectedDate(
        nextSearch.get("date"),
        getCurrentTimestamp(),
      );
      const nextViewMode = resolveCalendarViewMode(nextSearch.get("view"));
      const nextActiveTab = resolveCalendarTab(
        nextSearch.get("tab"),
        isAdminOrMaker,
      );

      setDate((current) =>
        getLabDayKey(current) === getLabDayKey(nextDate) ? current : nextDate,
      );
      setViewMode((current) =>
        current === nextViewMode ? current : nextViewMode,
      );
      setActiveTab((current) =>
        current === nextActiveTab ? current : nextActiveTab,
      );
    },
    [isAdminOrMaker],
  );

  React.useEffect(() => {
    const handlePopState = () => {
      syncFromSearch(new URLSearchParams(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncFromSearch]);

  React.useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    const todayKey = getLabDayKey(getCurrentTimestamp());
    const selectedDateKey = getLabDayKey(date);

    if (selectedDateKey === todayKey) {
      next.delete("date");
    } else {
      next.set("date", selectedDateKey);
    }

    if (viewMode === "day") {
      next.delete("view");
    } else {
      next.set("view", viewMode);
    }

    if (!isAdminOrMaker || activeTab === "services") {
      next.delete("tab");
    } else {
      next.set("tab", activeTab);
    }

    const query = next.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [activeTab, date, isAdminOrMaker, pathname, viewMode]);

  const frame = useQuery(api.calendar.query.getCalendarFrame);
  const frameLoading = frame === undefined;
  const visibleRange = React.useMemo(
    () => getVisibleRange(date, viewMode),
    [date, viewMode],
  );
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
    setDate((current) => shiftDate(current, viewMode, -1));
  }

  function handleNextPeriod() {
    setDate((current) => shiftDate(current, viewMode, 1));
  }

  function handleReset() {
    setDate(getLabDayStart(getCurrentTimestamp()));
  }

  function handleSelectDate(nextDate: Date | undefined) {
    if (nextDate) {
      setDate(nextDate);
    }
  }

  function handleSetViewMode(mode: ReturnType<typeof resolveCalendarViewMode>) {
    setViewMode(mode);
  }

  function handleSetActiveTab(tab: ReturnType<typeof resolveCalendarTab>) {
    setActiveTab(tab);
  }

  function handleOpenDay(nextDate: Date) {
    setDate(nextDate);
    setViewMode("day");
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
    setViewMode: handleSetViewMode,
    activeTab,
    setActiveTab: handleSetActiveTab,
    visibleRange,
    frame,
    frameLoading,
    isAdminOrMaker,
    isCalendarLoading: frameLoading || bookingsLoading,
    bookingsLoading,
    bookingItems,
    totalBookings,
    totalProjects,
    selectedProjectId,
    isDetailsOpen,
    handlePrevPeriod,
    handleNextPeriod,
    handleReset,
    handleOpenDay,
    handleOpenProjectDetails,
    handleDetailsOpenChange,
    ...viewModels,
  };
}

type BookingCalendarController = ReturnType<
  typeof useCreateBookingCalendarController
>;

const BookingCalendarControllerContext =
  React.createContext<BookingCalendarController | null>(null);

export function BookingCalendarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const controller = useCreateBookingCalendarController();

  return React.createElement(
    BookingCalendarControllerContext.Provider,
    { value: controller },
    children,
  );
}

export function useBookingCalendarController() {
  const controller = React.useContext(BookingCalendarControllerContext);

  if (!controller) {
    throw new Error(
      "useBookingCalendarController must be used within BookingCalendarProvider.",
    );
  }

  return controller;
}
