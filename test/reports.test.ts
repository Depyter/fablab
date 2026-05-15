import { describe, expect, test } from "vitest";
import { api, internal } from "../convex/_generated/api";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import resendComponent from "@convex-dev/resend/test";

process.env.RESEND_TEST_MODE = "true";
process.env.RESEND_API_KEY ??= "test-api-key";
process.env.DISABLE_SCHEDULED_EMAILS = "true";

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = 24 * HOUR_MS;

async function setupReportFixture() {
  const t = convexTest(schema, import.meta.glob("../convex/**/*.{ts,tsx}"));
  rateLimiterComponent.register(t);
  resendComponent.register(t);

  // Create users: Aera (admin), Maker (maker), Harley (client)
  await t.mutation(internal.users.createUserProfile, {
    userId: "1",
    email: "delivered+harley@resend.dev",
    name: "Harley",
  });
  await t.mutation(internal.users.createAdmin, {
    userId: "2",
    email: "delivered+aera@resend.dev",
    name: "Aera",
  });

  // Create a maker user
  await t.mutation(internal.users.createMaker, {
    userId: "3",
    email: "delivered+mak@resend.dev",
    name: "Maker",
  });

  const tHarley = t.withIdentity({ subject: "1", name: "Harley" });
  const tAera = t.withIdentity({ subject: "2", name: "Aera" });
  const tMaker = t.withIdentity({ subject: "3", name: "Maker" });

  // Create a FABRICATION service
  await tAera.mutation(api.services.mutate.addService, {
    name: "3D Printing",
    images: [],
    samples: [],
    serviceCategory: {
      type: "FABRICATION",
      materials: [],
      setupFee: 50,
      unitName: "hour",
      timeRate: 100,
    },
    requirements: ["design"],
    fileTypes: [],
    description: "FDM and SLA printing",
    status: "Available",
  });

  // Create a WORKSHOP service
  await tAera.mutation(api.services.mutate.addService, {
    name: "Laser Cutting Workshop",
    images: [],
    samples: [],
    serviceCategory: {
      type: "WORKSHOP",
      amount: 500,
      schedules: [
        {
          date: Date.now() + DAY_MS,
          timeSlots: [
            { startTime: 9 * HOUR_MS, endTime: 12 * HOUR_MS, maxSlots: 10 },
          ],
        },
      ],
    },
    requirements: [],
    fileTypes: [],
    description: "Intro to laser cutting",
    status: "Available",
  });

  // Create a resource
  await tAera.mutation(api.resource.mutate.addResource, {
    name: "Prusa MK4",
    category: "machine",
    type: "3D printer",
    images: [],
    description: "Primary FDM printer",
    status: "Available",
  });

  // Create a material
  await tAera.mutation(api.materials.mutate.addMaterial, {
    name: "PLA Filament",
    category: "Filament",
    unit: "g",
    currentStock: 5000,
    costPerUnit: 0.5,
    pricePerUnit: 1.0,
    reorderThreshold: 500,
    status: "IN_STOCK",
  });

  // Resolve IDs
  const ids = await t.run(async (ctx) => {
    const services = await ctx.db.query("services").collect();
    const fabricationSvc = services.find((s) => s.name === "3D Printing")!;
    const workshopSvc = services.find(
      (s) => s.name === "Laser Cutting Workshop",
    )!;
    const resource = await ctx.db.query("resources").first()!;
    const material = await ctx.db.query("materials").first()!;
    const maker = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", "3"))
      .first();
    return {
      fabricationServiceId: fabricationSvc._id,
      workshopServiceId: workshopSvc._id,
      resourceId: resource!._id,
      materialId: material!._id,
      makerId: maker!._id,
    };
  });

  return { t, tHarley, tAera, tMaker, ids };
}

describe("Reports — getReportMetrics", () => {
  test("returns zeroes when no data exists in range", async () => {
    const { tAera } = await setupReportFixture();
    const now = Date.now();

    const metrics = await tAera.query(api.reports.query.getReportMetrics, {
      dateFrom: now + 100 * DAY_MS,
      dateTo: now + 200 * DAY_MS,
    });

    expect(metrics.projectCount).toBe(0);
    expect(metrics.workshopCount).toBe(0);
    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.totalMaterialCost).toBe(0);
    expect(metrics.projectCountByStatus).toEqual({});
    expect(metrics.resourceUtilization).toEqual([]);
    expect(metrics.materialUsage).toEqual([]);
    expect(metrics.topServices).toEqual([]);
  });

  test("aggregates project counts by status and type", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    // Create multiple projects with different statuses
    const p1 = await tHarley.mutation(api.projects.mutate.createProject, {
      name: "Project Alpha",
      pricing: "Default",
      description: "First project",
      fulfillmentMode: "self-service",
      material: "provide-own",
      files: [],
      service: ids.fabricationServiceId,
      notes: "",
      booking: {
        startTime: now + HOUR_MS,
        endTime: now + 2 * HOUR_MS,
        date: now + DAY_MS,
      },
    });

    await tHarley.mutation(api.projects.mutate.createProject, {
      name: "Project Beta",
      pricing: "Default",
      description: "Second project",
      fulfillmentMode: "self-service",
      material: "provide-own",
      files: [],
      service: ids.fabricationServiceId,
      notes: "",
      booking: {
        startTime: now + 2 * HOUR_MS,
        endTime: now + 3 * HOUR_MS,
        date: now + 2 * DAY_MS,
      },
    });

    // Create a WORKSHOP project
    await tHarley.mutation(api.projects.mutate.createProject, {
      name: "Workshop 1",
      pricing: "Default",
      description: "Workshop attendance",
      fulfillmentMode: "full-service",
      material: "provide-own",
      files: [],
      service: ids.workshopServiceId,
      notes: "",
      booking: {
        startTime: now + DAY_MS,
        endTime: now + DAY_MS + 3 * HOUR_MS,
        date: now + DAY_MS,
      },
    });

    // Approve one project to change its status
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId: p1.projectId,
      status: "approved",
      makerId: ids.makerId,
    });

    const metrics = await tAera.query(api.reports.query.getReportMetrics, {
      dateFrom: now - HOUR_MS,
      dateTo: now + 30 * DAY_MS,
    });

    expect(metrics.projectCount).toBe(3);
    expect(metrics.workshopCount).toBe(1);
    expect(metrics.projectCountByStatus).toEqual({
      pending: 2,
      approved: 1,
    });
  });

  test("calculates totalRevenue from paid projects", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Revenue Test",
        pricing: "Default",
        description: "Test revenue",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: ids.fabricationServiceId,
        notes: "",
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 2 * HOUR_MS,
          date: now + DAY_MS,
        },
      },
    );

    // Move through proper status transitions: pending → approved → completed → paid
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId,
      status: "approved",
      makerId: ids.makerId,
    });

    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId,
      status: "completed",
    });

    const usageId = await tAera.run(async (ctx) => {
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();
      return usage!._id;
    });

    // Set pricing so invoice gets populated
    await tAera.mutation(api.projects.mutate.updateUsagePricing, {
      projectId,
      usageId,
      duration: 1,
      rate: 100,
      timeCost: 100,
      materialCost: 50,
      setupFeePortion: 50,
      unitName: "hour",
    });

    // Mark as paid
    await tAera.mutation(api.projects.mutate.markProjectPaid, {
      projectId,
      receiptString: "REP-002",
      paymentMode: "cash",
      proof: "Revenue test payment",
    });

    const metrics = await tAera.query(api.reports.query.getReportMetrics, {
      dateFrom: now - HOUR_MS,
      dateTo: now + 30 * DAY_MS,
    });

    // total should be 200 (setupFee 50 + timeCost 100 + materialCost 50)
    expect(metrics.totalRevenue).toBe(200);
    // No materialsUsed were set on the usage, so material cost is 0
    expect(metrics.totalMaterialCost).toBe(0);
  });

  test("aggregates resource utilization", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    // Create a second resource
    await tAera.mutation(api.resource.mutate.addResource, {
      name: "Laser Cutter",
      category: "machine",
      type: "CO2",
      images: [],
      description: "Main laser cutter",
      status: "Available",
    });

    const secondResourceId = await tAera.run(async (ctx) => {
      const resources = await ctx.db.query("resources").collect();
      const laser = resources.find((r) => r.name === "Laser Cutter")!;
      return laser._id;
    });

    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Utilization Test",
        pricing: "Default",
        description: "Test utilization",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: ids.fabricationServiceId,
        notes: "",
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 5 * HOUR_MS,
          date: now + DAY_MS,
        },
      },
    );

    // Wait for scheduled functions
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tAera.finishAllScheduledFunctions(() => {});

    // Get the auto-created usage and assign resource
    const usageId = await tAera.run(async (ctx) => {
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();
      return usage!._id;
    });

    await tAera.mutation(api.projects.mutate.updateUsage, {
      projectId,
      usageId,
      resourceId: ids.resourceId,
    });

    // Create a second usage on the laser cutter — after the first usage ends
    const { usageId: secondUsageId } = await tAera.mutation(
      api.projects.mutate.createUsage,
      {
        projectId,
        startTime: now + 6 * HOUR_MS,
        endTime: now + 8 * HOUR_MS,
      },
    );

    await tAera.mutation(api.projects.mutate.updateUsage, {
      projectId,
      usageId: secondUsageId,
      resourceId: secondResourceId,
    });

    const metrics = await tAera.query(api.reports.query.getReportMetrics, {
      dateFrom: now - HOUR_MS,
      dateTo: now + 30 * DAY_MS,
    });

    // Prusa MK4: 1 usage of 4 hours (booking is 1h to 5h = 240 min)
    // Laser Cutter: 1 usage of 2 hours (from 6h to 8h = 120 min)
    expect(metrics.resourceUtilization).toHaveLength(2);

    const prusa = metrics.resourceUtilization.find(
      (r) => r.name === "Prusa MK4",
    );
    expect(prusa).toBeDefined();
    expect(prusa!.totalBookedMinutes).toBe(240);

    const laser = metrics.resourceUtilization.find(
      (r) => r.name === "Laser Cutter",
    );
    expect(laser).toBeDefined();
    expect(laser!.totalBookedMinutes).toBe(120);
  });

  test("aggregates material usage with costs", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    // Create a second material
    await tAera.mutation(api.materials.mutate.addMaterial, {
      name: "PETG Filament",
      category: "Filament",
      unit: "g",
      currentStock: 3000,
      costPerUnit: 0.8,
      pricePerUnit: 1.5,
      reorderThreshold: 300,
      status: "IN_STOCK",
    });

    const petgId = await tAera.run(async (ctx) => {
      const materials = await ctx.db.query("materials").collect();
      const petg = materials.find((m) => m.name === "PETG Filament")!;
      return petg._id;
    });

    // Create project and set materials via updateUsagePricing
    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Material Test",
        pricing: "Default",
        description: "Test materials",
        fulfillmentMode: "self-service",
        material: "buy-from-lab",
        materialIds: [ids.materialId, petgId],
        files: [],
        service: ids.fabricationServiceId,
        notes: "",
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 2 * HOUR_MS,
          date: now + DAY_MS,
        },
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    await tAera.finishAllScheduledFunctions(() => {});

    const usageId = await tAera.run(async (ctx) => {
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();
      return usage!._id;
    });

    // materialCost must equal sum of (amountUsed * pricePerUnit)
    // PLA: 50g * 1.0 = 50, PETG: 30g * 1.5 = 45, total = 95
    await tAera.mutation(api.projects.mutate.updateUsagePricing, {
      projectId,
      usageId,
      duration: 1,
      rate: 100,
      timeCost: 100,
      materialCost: 95,
      setupFeePortion: 50,
      unitName: "hour",
      materialsUsed: [
        { materialId: ids.materialId, amountUsed: 50 },
        { materialId: petgId, amountUsed: 30 },
      ],
    });

    const metrics = await tAera.query(api.reports.query.getReportMetrics, {
      dateFrom: now - HOUR_MS,
      dateTo: now + 30 * DAY_MS,
    });

    // PLA: 50g used * 0.5 costPerUnit = 25 cost
    // PETG: 30g used * 0.8 costPerUnit = 24 cost
    expect(metrics.materialUsage).toHaveLength(2);

    const pla = metrics.materialUsage.find((m) => m.name === "PLA Filament");
    expect(pla).toBeDefined();
    expect(pla!.totalUsed).toBe(50);
    expect(pla!.totalCost).toBe(25);
    expect(pla!.currentStock).toBe(4950); // 5000 - 50

    const petg = metrics.materialUsage.find((m) => m.name === "PETG Filament");
    expect(petg).toBeDefined();
    expect(petg!.totalUsed).toBe(30);
    expect(petg!.totalCost).toBe(24);
    expect(petg!.currentStock).toBe(2970); // 3000 - 30

    expect(metrics.totalMaterialCost).toBe(49); // 25 + 24
  });

  test("ranks top services by project count", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    // Create 2 fabrication projects and 1 workshop project
    for (let i = 0; i < 2; i++) {
      await tHarley.mutation(api.projects.mutate.createProject, {
        name: `Fab Project ${i}`,
        pricing: "Default",
        description: `Fabrication project ${i}`,
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: ids.fabricationServiceId,
        notes: "",
        booking: {
          startTime: now + (i + 1) * HOUR_MS,
          endTime: now + (i + 2) * HOUR_MS,
          date: now + (i + 1) * DAY_MS,
        },
      });
    }

    await tHarley.mutation(api.projects.mutate.createProject, {
      name: "Workshop Project",
      pricing: "Default",
      description: "A workshop",
      fulfillmentMode: "full-service",
      material: "provide-own",
      files: [],
      service: ids.workshopServiceId,
      notes: "",
      booking: {
        startTime: now + DAY_MS,
        endTime: now + DAY_MS + 3 * HOUR_MS,
        date: now + DAY_MS,
      },
    });

    const metrics = await tAera.query(api.reports.query.getReportMetrics, {
      dateFrom: now - HOUR_MS,
      dateTo: now + 30 * DAY_MS,
    });

    expect(metrics.topServices).toHaveLength(2);
    // 3D Printing should be first with 2 projects
    expect(metrics.topServices[0].serviceName).toBe("3D Printing");
    expect(metrics.topServices[0].projectCount).toBe(2);
    expect(metrics.topServices[1].projectCount).toBe(1);
  });

  test("denies access for client role", async () => {
    const { tHarley } = await setupReportFixture();
    const now = Date.now();

    await expect(
      tHarley.query(api.reports.query.getReportMetrics, {
        dateFrom: now - DAY_MS,
        dateTo: now + DAY_MS,
      }),
    ).rejects.toThrow("Unauthorized");
  });

  test("allows access for maker role", async () => {
    const { tMaker } = await setupReportFixture();
    const now = Date.now();

    const metrics = await tMaker.query(api.reports.query.getReportMetrics, {
      dateFrom: now - DAY_MS,
      dateTo: now + 30 * DAY_MS,
    });

    expect(metrics.projectCount).toBe(0);
    expect(Array.isArray(metrics.resourceUtilization)).toBe(true);
  });
});

describe("Reports — getRevenueBreakdown", () => {
  test("returns monthly and by-service revenue from paid projects", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Revenue Project",
        pricing: "Default",
        description: "Paid project",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: ids.fabricationServiceId,
        notes: "",
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 2 * HOUR_MS,
          date: now + DAY_MS,
        },
      },
    );

    // Move through proper status transitions
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId,
      status: "approved",
      makerId: ids.makerId,
    });

    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId,
      status: "completed",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await tAera.finishAllScheduledFunctions(() => {});

    const usageId = await tAera.run(async (ctx) => {
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();
      return usage!._id;
    });

    await tAera.mutation(api.projects.mutate.updateUsagePricing, {
      projectId,
      usageId,
      duration: 1,
      rate: 100,
      timeCost: 100,
      materialCost: 50,
      setupFeePortion: 50,
      unitName: "hour",
    });

    await tAera.mutation(api.projects.mutate.markProjectPaid, {
      projectId,
      receiptString: "REP-003",
      paymentMode: "gcash",
      proof: "Revenue breakdown test payment",
    });

    const revenue = await tAera.query(api.reports.query.getRevenueBreakdown, {
      dateFrom: now - HOUR_MS,
      dateTo: now + 30 * DAY_MS,
    });

    // Should have 1 monthly entry
    expect(revenue.monthly).toHaveLength(1);
    expect(revenue.monthly[0].revenue).toBe(200);
    expect(revenue.monthly[0].count).toBe(1);

    // Should have 1 service entry for 3D Printing
    expect(revenue.byService).toHaveLength(1);
    expect(revenue.byService[0].serviceName).toBe("3D Printing");
    expect(revenue.byService[0].revenue).toBe(200);
  });

  test("returns empty arrays when no paid projects exist in range", async () => {
    const { tAera } = await setupReportFixture();
    const now = Date.now();

    const revenue = await tAera.query(api.reports.query.getRevenueBreakdown, {
      dateFrom: now - DAY_MS,
      dateTo: now + DAY_MS,
    });

    expect(revenue.monthly).toEqual([]);
    expect(revenue.byService).toEqual([]);
  });
});

describe("Reports — getResourceDowntime", () => {
  test("returns all resources with current status and booking counts", async () => {
    const { tAera } = await setupReportFixture();
    const now = Date.now();

    // Create a second resource that is under maintenance
    await tAera.mutation(api.resource.mutate.addResource, {
      name: "Broken Machine",
      category: "machine",
      type: "CNC",
      images: [],
      description: "Currently broken",
      status: "Under Maintenance",
    });

    const downtime = await tAera.query(api.reports.query.getResourceDowntime, {
      dateFrom: now - DAY_MS,
      dateTo: now + DAY_MS,
    });

    expect(downtime).toHaveLength(2);

    const prusa = downtime.find((r) => r.name === "Prusa MK4");
    expect(prusa).toBeDefined();
    expect(prusa!.isUnderMaintenance).toBe(false);
    expect(prusa!.currentStatus).toBe("Available");
    expect(prusa!.totalDowntimeMinutes).toBe(0);
    expect(prusa!.bookingCount).toBe(0);

    const broken = downtime.find((r) => r.name === "Broken Machine");
    expect(broken).toBeDefined();
    expect(broken!.isUnderMaintenance).toBe(true);
    expect(broken!.currentStatus).toBe("Under Maintenance");
    // 2 days in minutes
    expect(broken!.totalDowntimeMinutes).toBe(2 * 24 * 60);
    expect(broken!.bookingCount).toBe(0);
  });

  test("reports booking count per resource", async () => {
    const { tAera, tHarley, ids } = await setupReportFixture();
    const now = Date.now();

    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Downtime Test",
        pricing: "Default",
        description: "Testing",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: ids.fabricationServiceId,
        notes: "",
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 2 * HOUR_MS,
          date: now + DAY_MS,
        },
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    await tAera.finishAllScheduledFunctions(() => {});

    const usageId = await tAera.run(async (ctx) => {
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();
      return usage!._id;
    });

    await tAera.mutation(api.projects.mutate.updateUsage, {
      projectId,
      usageId,
      resourceId: ids.resourceId,
    });

    const downtime = await tAera.query(api.reports.query.getResourceDowntime, {
      dateFrom: now - DAY_MS,
      dateTo: now + 30 * DAY_MS,
    });

    const prusa = downtime.find((r) => r.name === "Prusa MK4");
    expect(prusa).toBeDefined();
    expect(prusa!.bookingCount).toBe(1);
  });
});
