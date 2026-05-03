import {
  PROJECT_STATUS_LABELS,
  type ProjectStatusType,
} from "../../../convex/constants";

import { STATUS_STYLES } from "../project-status-styles";

const CALENDAR_STATUS_ACCENT_CLASS: Record<ProjectStatusType, string> = {
  approved: "bg-[var(--fab-teal)]",
  paid: "bg-[var(--fab-teal)]",
  pending: "bg-[var(--fab-amber)]",
  rejected: "bg-[var(--fab-magenta)]",
  cancelled: "bg-[var(--fab-magenta)]",
  completed: "bg-[var(--fab-purple)]",
};

export function getCalendarProjectStatus(
  status: string | null | undefined,
): ProjectStatusType {
  if (
    status &&
    Object.prototype.hasOwnProperty.call(PROJECT_STATUS_LABELS, status)
  ) {
    return status as ProjectStatusType;
  }

  return "pending";
}

export function getCalendarBookingColor(
  status: string | null | undefined,
  fallback = STATUS_STYLES.pending.badge,
) {
  const normalizedStatus = getCalendarProjectStatus(status);

  return STATUS_STYLES[normalizedStatus]?.badge ?? fallback;
}

export function getCalendarStatusAccentClass(
  status: string | null | undefined,
) {
  const normalizedStatus = getCalendarProjectStatus(status);

  return (
    CALENDAR_STATUS_ACCENT_CLASS[normalizedStatus] ?? "bg-muted-foreground"
  );
}
