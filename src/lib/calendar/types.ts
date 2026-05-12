import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectStatusType } from "../../../convex/constants";

export type CalendarViewMode = "day" | "week" | "month";
export type CalendarTab = "resources" | "services";
export type CalendarServiceCategoryType = "WORKSHOP" | "FABRICATION";

export interface CalendarAbsoluteTimeRange {
  startTime: number;
  endTime: number;
}

export interface CalendarDayWindow {
  startTime: number;
  endTime: number;
}

export interface CalendarBookingItem {
  _id: string;
  startTime: number;
  endTime: number;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: string;
  clientName: string;
  serviceId: Id<"services">;
  resourceId: Id<"resources"> | null;
}

export interface CalendarMachine {
  id: string;
  name: string;
  status: string;
  description: string;
  group?: string;
  href?: string;
  serviceCategoryType?: CalendarServiceCategoryType;
}

export interface CalendarSlotPresentation {
  slotClassName: string;
  accentClassName: string;
  isPendingReview: boolean;
}

export interface CalendarMachineUsage extends CalendarSlotPresentation {
  id: string;
  machineId: string;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: ProjectStatusType;
  clientName: string;
  date: number;
  startTime: number;
  endTime: number;
  serviceCategoryType: CalendarServiceCategoryType;
}

export interface CalendarRangeEvent {
  id: string;
  projectId: Id<"projects"> | null;
  projectAlias: string;
  projectStatus: ProjectStatusType;
  clientName: string;
  startTime: number;
  endTime: number;
  serviceId: Id<"services">;
  secondaryLabel: string;
  serviceCategoryType: CalendarServiceCategoryType;
  slotClassName: string;
  accentClassName: string;
  isPendingReview: boolean;
}

export interface CalendarFrameService {
  _id: Id<"services">;
  name: string;
  slug: string;
  status: string;
  serviceCategoryType: CalendarServiceCategoryType;
}

export interface CalendarFrameResource {
  _id: Id<"resources">;
  name: string;
  category: string | null;
  description?: string | null;
  status: string;
}

export interface CalendarFrameData {
  services?: CalendarFrameService[];
  resources?: CalendarFrameResource[];
}
