import { createFileRoute } from "@tanstack/react-router";
import { BookingCalendarPage } from "@/components/calendar/booking-calendar-page";

export const Route = createFileRoute("/_private/dashboard/_data-view/calendar")(
  {
    component: RouteComponent,
  },
);

function RouteComponent() {
  return <BookingCalendarPage />;
}
