import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectStatusType } from "../../../convex/constants";

export type CalendarViewMode = "day" | "week" | "month";
export type CalendarTab = "resources" | "services";

export interface CalendarAbsoluteTimeRange {
  startTime: number;
  endTime: number;
}

export interface CalendarDayWindow {
  startTime: number;
  endTime: number;
}

export interface CalendarBookingItem {
  _id: Id<"resourceUsage">;
  startTime: number;
  endTime: number;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: string;
  makerName: string;
  serviceId: Id<"services">;
  resourceId: Id<"resources"> | null;
}

export interface CalendarRangeEvent {
  id: string;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: ProjectStatusType;
  startTime: number;
  endTime: number;
  color?: string;
  secondaryLabel: string;
}
