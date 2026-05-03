import { describe, expect, test } from "vitest";
import type { Id } from "../convex/_generated/dataModel";

import {
  DAY_END,
  DAY_START,
  buildBookingCalendarViewModels,
  getCalendarProjectStatus,
  getCalendarSlotIndex,
  getCalendarSlotPresentation,
  normalizeCalendarBookingToDayWindow,
} from "../src/lib/calendar";

describe("calendar shared domain", () => {
  test("normalizes unknown project statuses to pending", () => {
    expect(getCalendarProjectStatus("approved")).toBe("approved");
    expect(getCalendarProjectStatus("not-a-real-status")).toBe("pending");
  });

  test("maps slot presentation by workflow and service category", () => {
    expect(
      getCalendarSlotPresentation({
        projectStatus: "pending",
        serviceCategoryType: "FABRICATION",
      }),
    ).toMatchObject({
      slotClassName: expect.stringContaining("amber"),
      accentClassName: "bg-amber-500",
      isPendingReview: true,
    });

    expect(
      getCalendarSlotPresentation({
        projectStatus: "approved",
        serviceCategoryType: "FABRICATION",
      }),
    ).toMatchObject({
      slotClassName: expect.stringContaining("emerald"),
      accentClassName: "bg-emerald-500",
      isPendingReview: false,
    });

    expect(
      getCalendarSlotPresentation({
        projectStatus: "approved",
        serviceCategoryType: "WORKSHOP",
      }),
    ).toMatchObject({
      slotClassName: expect.stringContaining("blue"),
      accentClassName: "bg-blue-500",
      isPendingReview: false,
    });
  });

  test("uses shared half-hour slot indexing", () => {
    expect(getCalendarSlotIndex(DAY_START)).toBe(0);
    expect(getCalendarSlotIndex(DAY_START + 1.5)).toBe(3);
    expect(getCalendarSlotIndex(DAY_END)).toBe((DAY_END - DAY_START) * 2);
  });

  test("clips and snaps booking windows into the visible lab day", () => {
    const window = normalizeCalendarBookingToDayWindow(
      {
        startTime: Date.parse("2026-05-06T01:40:00.000Z"),
        endTime: Date.parse("2026-05-06T03:10:00.000Z"),
      },
      {
        startTime: Date.parse("2026-05-05T16:00:00.000Z"),
        endTime: Date.parse("2026-05-06T16:00:00.000Z"),
      },
    );

    expect(window).toEqual({
      startTime: 9.5,
      endTime: 11.5,
    });
  });

  test("builds calendar view models from one transformer pipeline", () => {
    const fabricationServiceId = "service-fab" as Id<"services">;
    const workshopServiceId = "service-workshop" as Id<"services">;
    const resourceId = "resource-laser" as Id<"resources">;

    const viewModels = buildBookingCalendarViewModels({
      frame: {
        services: [
          {
            _id: fabricationServiceId,
            name: "Laser Cutting",
            slug: "laser-cutting",
            status: "Available",
            serviceCategoryType: "FABRICATION",
          },
          {
            _id: workshopServiceId,
            name: "Intro Workshop",
            slug: "intro-workshop",
            status: "Available",
            serviceCategoryType: "WORKSHOP",
          },
        ],
        resources: [
          {
            _id: resourceId,
            name: "Laser Cutter",
            category: "MACHINE",
            description: "CO2 laser",
            status: "Available",
          },
        ],
      },
      bookings: [
        {
          _id: "usage-fab" as Id<"resourceUsage">,
          startTime: Date.parse("2026-05-06T01:00:00.000Z"),
          endTime: Date.parse("2026-05-06T02:00:00.000Z"),
          projectId: "project-fab" as Id<"projects">,
          projectAlias: "Fabrication Job",
          projectStatus: "approved",
          makerName: "Aera",
          serviceId: fabricationServiceId,
          resourceId,
        },
        {
          _id: "usage-workshop" as Id<"resourceUsage">,
          startTime: Date.parse("2026-05-06T03:00:00.000Z"),
          endTime: Date.parse("2026-05-06T04:00:00.000Z"),
          projectId: "project-workshop" as Id<"projects">,
          projectAlias: "Workshop Slot",
          projectStatus: "approved",
          makerName: "Aera",
          serviceId: workshopServiceId,
          resourceId: null,
        },
      ],
      dayRange: {
        startTime: Date.parse("2026-05-05T16:00:00.000Z"),
        endTime: Date.parse("2026-05-06T16:00:00.000Z"),
      },
      activeTab: "services",
      viewMode: "month",
    });

    expect(viewModels.serviceMachines).toHaveLength(2);
    expect(viewModels.rangeEvents).toHaveLength(2);
    expect(viewModels.rangeEvents[0]?.slotClassName).toContain("emerald");
    expect(viewModels.rangeEvents[1]?.slotClassName).toContain("blue");

    const dayViewModels = buildBookingCalendarViewModels({
      frame: {
        services: [
          {
            _id: fabricationServiceId,
            name: "Laser Cutting",
            slug: "laser-cutting",
            status: "Available",
            serviceCategoryType: "FABRICATION",
          },
        ],
        resources: [
          {
            _id: resourceId,
            name: "Laser Cutter",
            category: "MACHINE",
            description: "CO2 laser",
            status: "Available",
          },
        ],
      },
      bookings: [
        {
          _id: "usage-pending" as Id<"resourceUsage">,
          startTime: Date.parse("2026-05-06T01:00:00.000Z"),
          endTime: Date.parse("2026-05-06T02:00:00.000Z"),
          projectId: "project-pending" as Id<"projects">,
          projectAlias: "Pending Review",
          projectStatus: "pending",
          makerName: "Aera",
          serviceId: fabricationServiceId,
          resourceId,
        },
      ],
      dayRange: {
        startTime: Date.parse("2026-05-05T16:00:00.000Z"),
        endTime: Date.parse("2026-05-06T16:00:00.000Z"),
      },
      activeTab: "resources",
      viewMode: "day",
    });

    expect(dayViewModels.resourceUsages[0]).toMatchObject({
      slotClassName: expect.stringContaining("amber"),
      isPendingReview: true,
      startTime: 9,
      endTime: 10,
    });
  });
});
