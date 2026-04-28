import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import { flushScheduledFunctions, setupProject, setupUsers } from "./helper";

const HOUR_MS = 1000 * 60 * 60;

describe("Material lifecycle and resourceUsage integration", () => {
  test("material initialization and updates seed project usage snapshots", async () => {
    const { t, tAera, tHarley } = await setupUsers();

    const materialId = await tAera.mutation(api.materials.mutate.addMaterial, {
      name: "Acrylic Sheet",
      category: "Sheets",
      unit: "sheet",
      currentStock: 12,
      costPerUnit: 80,
      pricePerUnit: 120,
      reorderThreshold: 3,
      color: "Clear",
      status: "IN_STOCK",
    });

    await tAera.mutation(api.materials.mutate.updateMaterial, {
      id: materialId,
      currentStock: 10,
      pricePerUnit: 150,
      color: "Black",
      status: "LOW_STOCK",
    });

    await tAera.mutation(api.services.mutate.addService, {
      name: "laser cutting",
      images: [],
      samples: [],
      serviceCategory: {
        type: "FABRICATION",
        materials: [materialId],
        setupFee: 1,
        unitName: "hour",
        timeRate: 2,
      },
      requirements: ["vector file"],
      fileTypes: [],
      description: "laser cutting service",
      status: "Available",
    });

    const serviceId = await t.run(async (ctx) => {
      const service = await ctx.db.query("services").first();
      return service!._id;
    });

    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "material seeded project",
        pricing: "Default",
        description: "cut an acrylic sign",
        fulfillmentMode: "self-service",
        material: "buy-from-lab",
        requestedMaterials: [materialId],
        files: [],
        service: serviceId,
        notes: "use black acrylic",
        booking: {
          startTime: Date.now() + HOUR_MS,
          endTime: Date.now() + 2 * HOUR_MS,
          date: Date.now() + 24 * HOUR_MS,
        },
      },
    );

    await flushScheduledFunctions(t);

    const details = await tHarley.query(api.projects.query.getProject, {
      projectId,
    });

    await t.run(async (ctx) => {
      const material = await ctx.db.get(materialId);
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();

      expect(material).toMatchObject({
        _id: materialId,
        name: "Acrylic Sheet",
        currentStock: 10,
        pricePerUnit: 150,
        costPerUnit: 80,
        color: "Black",
        status: "LOW_STOCK",
      });

      expect(usage!.materialsUsed).toEqual([
        {
          materialId,
          amountUsed: 0,
          snapshot: {
            name: "Acrylic Sheet",
            unit: "sheet",
            pricePerUnit: 150,
            costPerUnit: 80,
          },
        },
      ]);
    });

    expect(details.requestedMaterials).toEqual([
      {
        _id: materialId,
        name: "Acrylic Sheet",
        unit: "sheet",
        pricePerUnit: 150,
      },
    ]);
    expect(details.resourceUsages[0].materialsUsed).toEqual([
      {
        materialId,
        amountUsed: 0,
        snapshot: {
          name: "Acrylic Sheet",
          unit: "sheet",
          pricePerUnit: 150,
          costPerUnit: 80,
        },
        name: "Acrylic Sheet",
        unit: "sheet",
      },
    ]);
  });

  test("material assignment updates requested materials and resourceUsage rows", async () => {
    const { t, tAera, tHarley } = await setupUsers();

    const firstMaterialId = await tAera.mutation(
      api.materials.mutate.addMaterial,
      {
        name: "PLA",
        category: "Filament",
        unit: "g",
        currentStock: 100,
        pricePerUnit: 2,
        reorderThreshold: 10,
        status: "IN_STOCK",
      },
    );

    const secondMaterialId = await tAera.mutation(
      api.materials.mutate.addMaterial,
      {
        name: "PETG",
        category: "Filament",
        unit: "g",
        currentStock: 100,
        pricePerUnit: 3,
        reorderThreshold: 10,
        status: "IN_STOCK",
      },
    );

    await tAera.mutation(api.services.mutate.addService, {
      name: "3d printing",
      images: [],
      samples: [],
      serviceCategory: {
        type: "FABRICATION",
        materials: [firstMaterialId, secondMaterialId],
        setupFee: 1,
        unitName: "hour",
        timeRate: 2,
      },
      requirements: ["design"],
      fileTypes: [],
      description: "3d printing service",
      status: "Available",
    });

    const serviceId = await t.run(async (ctx) => {
      const service = await ctx.db.query("services").first();
      return service!._id;
    });

    const { projectId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "material reassignment",
        pricing: "Default",
        description: "switch materials",
        fulfillmentMode: "self-service",
        material: "buy-from-lab",
        requestedMaterials: [firstMaterialId],
        files: [],
        service: serviceId,
        notes: "swap to petg",
        booking: {
          startTime: Date.now() + HOUR_MS,
          endTime: Date.now() + 2 * HOUR_MS,
          date: Date.now() + 24 * HOUR_MS,
        },
      },
    );

    await flushScheduledFunctions(t);

    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId,
      materialIds: [secondMaterialId],
    });

    const details = await tHarley.query(api.projects.query.getProject, {
      projectId,
    });

    await t.run(async (ctx) => {
      const project = await ctx.db.get(projectId);
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();

      expect(project!.requestedMaterials).toEqual([secondMaterialId]);
      expect(usage!.materialsUsed).toEqual([
        {
          materialId: secondMaterialId,
          amountUsed: 0,
          snapshot: {
            name: "PETG",
            unit: "g",
            pricePerUnit: 3,
            costPerUnit: undefined,
          },
        },
      ]);
    });

    expect(details.requestedMaterials).toEqual([
      {
        _id: secondMaterialId,
        name: "PETG",
        unit: "g",
        pricePerUnit: 3,
      },
    ]);
    expect(details.resourceUsages[0].materialsUsed).toEqual([
      {
        materialId: secondMaterialId,
        amountUsed: 0,
        snapshot: {
          name: "PETG",
          unit: "g",
          pricePerUnit: 3,
          costPerUnit: undefined,
        },
        name: "PETG",
        unit: "g",
      },
    ]);
  });
});

describe("Resource lifecycle and resourceUsage integration", () => {
  test("resource initialization and updates persist fields", async () => {
    const { t, tAera } = await setupUsers();

    await tAera.mutation(api.resource.mutate.addResource, {
      name: "Laser Cutter",
      category: "machine",
      type: "CO2",
      images: [],
      description: "Main cutting machine",
      status: "Available",
    });

    const resourceId = await t.run(async (ctx) => {
      const resource = await ctx.db.query("resources").first();
      return resource!._id;
    });

    await tAera.mutation(api.resource.mutate.updateResource, {
      id: resourceId,
      name: "Laser Cutter A",
      type: "Fiber",
      description: "Updated cutting machine",
      status: "Under Maintenance",
    });

    await t.run(async (ctx) => {
      const resource = await ctx.db.get(resourceId);
      expect(resource).toMatchObject({
        _id: resourceId,
        name: "Laser Cutter A",
        category: "machine",
        type: "Fiber",
        description: "Updated cutting machine",
        status: "Under Maintenance",
      });
    });
  });

  test("resource assignment updates resourceUsage and project query details", async () => {
    const { t, tAera, tHarley, projectId } = await setupProject();

    await tAera.mutation(api.resource.mutate.addResource, {
      name: "Prusa MK4",
      category: "machine",
      type: "3D printer",
      images: [],
      description: "Primary printer",
      status: "Available",
    });

    const resourceId = await t.run(async (ctx) => {
      const resource = await ctx.db.query("resources").first();
      return resource!._id;
    });

    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId,
      resourceId,
    });

    await tAera.mutation(api.resource.mutate.updateResource, {
      id: resourceId,
      name: "Prusa MK4",
      type: "3D printer XL",
      description: "Calibrated primary printer",
      status: "Under Maintenance",
    });

    const details = await tHarley.query(api.projects.query.getProject, {
      projectId,
    });

    await t.run(async (ctx) => {
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();

      expect(usage!.resource).toBe(resourceId);
    });

    expect(details.resourceUsages[0]).toMatchObject({
      resource: resourceId,
      resourceDetails: {
        _id: resourceId,
        category: "machine",
        type: "3D printer XL",
        status: "Under Maintenance",
        description: "Calibrated primary printer",
      },
    });
  });

  test("usage updates preserve resource assignments and recalculate project totals", async () => {
    const { t, tAera, tHarley, projectId } = await setupProject();

    await tAera.mutation(api.resource.mutate.addResource, {
      name: "Prusa MK4",
      category: "machine",
      type: "3D printer",
      images: [],
      description: "Primary printer",
      status: "Available",
    });

    const { resourceId, usageId } = await t.run(async (ctx) => {
      const resource = await ctx.db.query("resources").first();
      const usage = await ctx.db
        .query("resourceUsage")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .first();

      return {
        resourceId: resource!._id,
        usageId: usage!._id,
      };
    });

    const updatedStart = Date.now() + 48 * HOUR_MS;
    const updatedEnd = updatedStart + 4 * HOUR_MS;

    await tAera.mutation(api.resource.mutate.updateUsage, {
      id: usageId,
      resource: resourceId,
      startTime: updatedStart,
      endTime: updatedEnd,
    });

    const details = await tHarley.query(api.projects.query.getProject, {
      projectId,
    });

    expect(details.totalInvoice).toEqual({
      subtotal: 8,
      tax: 0,
      total: 8,
    });
    expect(details.bookingStartTime).toBe(updatedStart);
    expect(details.bookingEndTime).toBe(updatedEnd);
    expect(details.resourceUsages[0]).toMatchObject({
      _id: usageId,
      resource: resourceId,
      startTime: updatedStart,
      endTime: updatedEnd,
      snapshot: {
        costAtTime: 8,
      },
      resourceDetails: {
        _id: resourceId,
        category: "machine",
        type: "3D printer",
        status: "Available",
        description: "Primary printer",
      },
    });
  });
});
