import dynamic from "next/dynamic";
import { CalendarLoadingState } from "./calendar-loading";

const BookingCalendarClient = dynamic(
  () =>
    import("./booking-calendar-view").then(
      (module) => module.BookingCalendarView,
    ),
  {
    loading: () => <CalendarLoadingState />,
  },
);

export function BookingCalendarShell() {
  return <BookingCalendarClient />;
}
