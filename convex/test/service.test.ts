import { describe, test } from "vitest";
import { api } from "../_generated/api";
import { expect } from "vitest";
import { setupUsers } from "./helper";

describe("Service functions", () => {
  test("Add Service (Admin/Maker)", async () => {
    const { t, tAera } = await setupUsers();

    const imageBytes = new Uint8Array([1111]);
    const blob = new Blob([imageBytes], { type: "image/png" });
    const storageId = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(blob);
      return storageId;
    });

    await tAera.mutation(api.services.mutate.addService, {
      name: "3d printing",
      images: [storageId],
      samples: [storageId],
      regularPrice: 4,
      upPrice: 2,
      unitPrice: "min",
      requirements: ["design", "model"],
      description: "printing services",
      status: "Available",
    });

    await t.run(async (ctx) => {
      const service = await ctx.db.query("services").collect();

      expect(service.length).toBe(1);
      expect(service[0].name).toBe("3d printing");
      expect(service[0].description).toBe("printing services");
      expect(service[0].status).toBe("Available");

      expect(service[0].images.length).toBe(1);
      const file = await ctx.storage.get(service[0].images[0]);
      expect(file).not.toBeNull();

      expect(file).toEqual(blob);
    });
  });
  test("Add Service (Non-admin/Maker)", async () => {
    const { t, tHarley } = await setupUsers();

    await expect(async () => {
      await t.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        samples: [],
        regularPrice: 4,
        upPrice: 2,
        unitPrice: "min",
        requirements: ["design", "model"],
        description: "printing services",
        status: "Available",
      });
    }).rejects.toThrowError("No identity!");

    await expect(async () => {
      await tHarley.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        samples: [],
        regularPrice: 4,
        upPrice: 2,
        unitPrice: "min",
        requirements: ["design", "model"],
        description: "printing services",
        status: "Available",
      });
    }).rejects.toThrowError("Unauthorized. Cannot add service.");
  });

  test("Update Service (Admin/Maker)", async () => {
    const { t, tAera } = await setupUsers();

    await tAera.mutation(api.services.mutate.addService, {
      name: "3d printing",
      images: [],
      samples: [],
      regularPrice: 4,
      upPrice: 2,
      unitPrice: "min",
      requirements: ["design", "model"],
      description: "printing services",
      status: "Available",
    });

    let service = await t.run(async (ctx) => {
      return await ctx.db.query("services").collect();
    });

    await tAera.mutation(api.services.mutate.updateService, {
      service: service[0]._id,
      name: "test",
      description: "test",
      status: "Unavailable",
    });

    await t.run(async (ctx) => {
      service = await ctx.db.query("services").collect();

      expect(service.length).toBe(1);
      expect(service[0].name).toBe("test");
      expect(service[0].description).toBe("test");
      expect(service[0].status).toBe("Unavailable");
    });

    const imageBytes = new Uint8Array([1111]);
    const blob = new Blob([imageBytes], { type: "image/png" });
    const storageId = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(blob);
      return storageId;
    });

    await tAera.mutation(api.services.mutate.addImageToService, {
      service: service[0]._id,
      image: storageId,
    });

    await t.run(async (ctx) => {
      service = await ctx.db.query("services").collect();
      expect(service.length).toBe(1);
      expect(service[0].images.length).toBe(1);

      const file = await ctx.storage.get(service[0].images[0]);
      expect(file).toEqual(blob);
    });
  });
  test("Update Service (Non-admin/Maker)", async () => {});

  test("Remove Service (Admin/Maker)", async () => {
    const { t, tAera } = await setupUsers();

    const imageBytes = new Uint8Array([1111]);
    const blob = new Blob([imageBytes], { type: "image/png" });
    const storageId = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(blob);
      return storageId;
    });

    await tAera.mutation(api.services.mutate.addService, {
      name: "3d printing",
      images: [storageId],
      samples: [storageId],
      regularPrice: 4,
      upPrice: 2,
      unitPrice: "min",
      requirements: ["design", "model"],
      description: "printing services",
      status: "Available",
    });

    let service = await t.run(async (ctx) => {
      return await ctx.db.query("services").collect();
    });

    await tAera.mutation(api.services.mutate.deleteService, {
      service: service[0]._id,
    });

    service = await t.run(async (ctx) => {
      return await ctx.db.query("services").collect();
    });

    expect(service.length).toBe(0);
    const file = await t.run(async (ctx) => {
      return await ctx.storage.get(storageId);
    });
    expect(file).toBeNull();
  });
  test("Remove Service (Non-admin/Maker)", async () => {
    const { t, tAera, tHarley } = await setupUsers();

    await tAera.mutation(api.services.mutate.addService, {
      name: "3d printing",
      images: [],
      samples: [],
      regularPrice: 4,
      upPrice: 2,
      unitPrice: "min",
      requirements: ["design", "model"],
      description: "printing services",
      status: "Available",
    });

    const service = await t.run(async (ctx) => {
      return await ctx.db.query("services").collect();
    });

    expect(service.length).toBe(1);
    expect(service[0].name).toBe("3d printing");

    await expect(async () => {
      await tHarley.mutation(api.services.mutate.deleteService, {
        service: service[0]._id,
      });
    }).rejects.toThrowError("Unauthorized. Cannot delete service.");
  });
});
