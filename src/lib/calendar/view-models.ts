import { ResourceStatus, ServiceStatus } from "../../../convex/constants";

import {
  getCalendarResourceGroupLabel,
  getCalendarServiceGroupLabel,
} from "./labels";
import {
  getCalendarProjectStatus,
  getCalendarSlotPresentation,
} from "./status";
import type {
  CalendarBookingItem,
  CalendarFrameData,
  CalendarFrameResource,
  CalendarFrameService,
  CalendarMachine,
  CalendarMachineUsage,
  CalendarRangeEvent,
  CalendarTab,
  CalendarViewMode,
} from "./types";
import { normalizeCalendarBookingToDayWindow } from "./windows";

function buildResourcesById(resources: CalendarFrameResource[]) {
  return new Map(resources.map((resource) => [resource._id, resource]));
}

function buildServicesById(services: CalendarFrameService[]) {
  return new Map(services.map((service) => [service._id, service]));
}

function buildResourceMachines(
  resources: CalendarFrameResource[],
): CalendarMachine[] {
  return resources.map((resource) => ({
    id: resource._id,
    name: resource.name,
    status:
      resource.status === ResourceStatus.UNAVAILABLE
        ? ResourceStatus.UNAVAILABLE
        : ResourceStatus.AVAILABLE,
    description:
      resource.description || `${resource.category?.toLowerCase()} resource`,
    group: getCalendarResourceGroupLabel(resource.category),
  }));
}

function buildServiceMachines(
  services: CalendarFrameService[],
): CalendarMachine[] {
  return services.map((service) => ({
    id: service._id,
    name: service.name,
    href: `/services/${service.name}`,
    status:
      service.status === ServiceStatus.UNAVAILABLE
        ? ResourceStatus.UNAVAILABLE
        : ResourceStatus.AVAILABLE,
    description: "Service Booking Queue",
    group: getCalendarServiceGroupLabel(service.serviceCategoryType),
    serviceCategoryType: service.serviceCategoryType,
  }));
}

function buildCalendarUsage(
  booking: CalendarBookingItem,
  machineId: string,
  serviceCategoryType: CalendarFrameService["serviceCategoryType"],
  dayRange: { startTime: number; endTime: number },
): CalendarMachineUsage | null {
  const window = normalizeCalendarBookingToDayWindow(booking, dayRange);

  if (!window) return null;

  const projectStatus = getCalendarProjectStatus(booking.projectStatus);
  const slotPresentation = getCalendarSlotPresentation({
    projectStatus,
    serviceCategoryType,
  });

  return {
    id: booking._id,
    machineId,
    projectId: booking.projectId,
    projectAlias: booking.projectAlias,
    projectStatus,
    clientName: booking.clientName,
    date: booking.startTime,
    startTime: window.startTime,
    endTime: window.endTime,
    serviceCategoryType,
    ...slotPresentation,
  };
}

function buildCalendarRangeEvent(args: {
  booking: CalendarBookingItem;
  secondaryLabel: string;
  serviceCategoryType: CalendarFrameService["serviceCategoryType"];
}): CalendarRangeEvent {
  const { booking, secondaryLabel, serviceCategoryType } = args;
  const projectStatus = getCalendarProjectStatus(booking.projectStatus);
  const slotPresentation = getCalendarSlotPresentation({
    projectStatus,
    serviceCategoryType,
  });

  return {
    id: booking._id,
    projectId: booking.projectId,
    projectAlias: booking.projectAlias,
    projectStatus,
    clientName: booking.clientName,
    startTime: booking.startTime,
    endTime: booking.endTime,
    serviceId: booking.serviceId,
    secondaryLabel,
    serviceCategoryType,
    ...slotPresentation,
  };
}

export function buildBookingCalendarViewModels(args: {
  frame?: CalendarFrameData | null;
  bookings: CalendarBookingItem[];
  dayRange: { startTime: number; endTime: number };
  activeTab: CalendarTab;
  viewMode: CalendarViewMode;
}) {
  const services = args.frame?.services ?? [];
  const resources = args.frame?.resources ?? [];
  const servicesById = buildServicesById(services);
  const resourcesById = buildResourcesById(resources);

  const resourceMachines = buildResourceMachines(resources);
  const serviceMachines = buildServiceMachines(services);

  // ── Resource usages (day view) ─────────────────────────────────────────
  // Cluster workshop resource usages by (resourceId, startTime, endTime) so
  // the calendar shows one block per slot rather than one per project.
  const resourceUsages =
    args.viewMode !== "day"
      ? []
      : (() => {
          const workshopClusters = new Map<string, CalendarMachineUsage[]>();
          const clusterServiceNames = new Map<string, string>();
          const regular: CalendarMachineUsage[] = [];

          for (const booking of args.bookings) {
            if (!booking.resourceId) continue;

            const service = servicesById.get(booking.serviceId);
            if (!service) continue;

            const usage = buildCalendarUsage(
              booking,
              booking.resourceId,
              service.serviceCategoryType,
              args.dayRange,
            );
            if (!usage) continue;

            if (service.serviceCategoryType === "WORKSHOP") {
              const key = `${booking.resourceId}:${usage.startTime}:${usage.endTime}`;
              const cluster = workshopClusters.get(key);
              if (cluster) {
                cluster.push(usage);
              } else {
                workshopClusters.set(key, [usage]);
                clusterServiceNames.set(key, service.name);
              }
            } else {
              regular.push(usage);
            }
          }

          // Convert each workshop cluster to a single aggregated entry
          for (const [key, cluster] of workshopClusters) {
            const first = cluster[0]!;
            const serviceName = clusterServiceNames.get(key) ?? "Workshop";
            regular.push({
              ...first,
              id: `ws-res-${first.machineId}-${first.startTime}`,
              projectId: null,
              projectAlias: serviceName,
              projectStatus: "approved",
              clientName: `${cluster.length} booked`,
              isPendingReview: false,
            });
          }

          return regular;
        })();

  const serviceUsages =
    args.viewMode !== "day"
      ? []
      : args.bookings.flatMap((booking) => {
          const service = servicesById.get(booking.serviceId);

          if (!service) return [];

          const usage = buildCalendarUsage(
            booking,
            booking.serviceId,
            service.serviceCategoryType,
            args.dayRange,
          );

          return usage ? [usage] : [];
        });

  const rangeEvents =
    args.viewMode === "day"
      ? []
      : (args.activeTab === "resources"
          ? args.bookings.filter((booking) => booking.resourceId !== null)
          : args.bookings
        ).flatMap((booking) => {
          const service = servicesById.get(booking.serviceId);

          if (!service) return [];

          const secondaryLabel =
            args.activeTab === "resources"
              ? (booking.resourceId
                  ? resourcesById.get(booking.resourceId)?.name
                  : null) || "Machine"
              : service.name || "Service";

          return [
            buildCalendarRangeEvent({
              booking,
              secondaryLabel,
              serviceCategoryType: service.serviceCategoryType,
            }),
          ];
        });

  return {
    resourceMachines,
    serviceMachines,
    resourceUsages,
    serviceUsages,
    rangeEvents,
  };
}
