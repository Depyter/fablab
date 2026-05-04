import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { BookingCalendarShell } from "@/components/calendar/booking-calendar-shell";

export default async function CalendarPage() {
  const preloadedFrame = await preloadAuthQuery(
    api.calendar.query.getCalendarFrame,
    {},
  );

  return <BookingCalendarShell preloadedFrame={preloadedFrame} />;
}
