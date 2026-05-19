import {
  PROJECT_STATUS_LABELS,
  type ProjectStatusType,
} from "../../../convex/constants";

import type {
  CalendarServiceCategoryType,
  CalendarSlotPresentation,
} from "./types";

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

export function getCalendarSlotPresentation(args: {
  projectStatus: string | null | undefined;
  serviceCategoryType: CalendarServiceCategoryType;
}): CalendarSlotPresentation {
  const projectStatus = getCalendarProjectStatus(args.projectStatus);

  if (projectStatus === "rejected" || projectStatus === "cancelled") {
    return {
      slotClassName: "bg-red-100 border-red-300 text-red-800",
      accentClassName: "bg-red-500",
      isPendingReview: false,
    };
  }

  if (projectStatus === "pending") {
    return {
      slotClassName: "bg-amber-100 border-amber-300 text-amber-900",
      accentClassName: "bg-amber-500",
      isPendingReview: true,
    };
  }

  if (args.serviceCategoryType === "WORKSHOP") {
    return {
      slotClassName: "bg-white border-fab-teal text-fab-teal",
      accentClassName: "bg-fab-teal",
      isPendingReview: false,
    };
  }

  return {
    slotClassName: "bg-emerald-100 border-emerald-300 text-emerald-800",
    accentClassName: "bg-emerald-500",
    isPendingReview: false,
  };
}
