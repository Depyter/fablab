import { describe, test } from "vitest";
import { api } from "../_generated/api";
import { expect } from "vitest";
import { setupUsers } from "./helper";

describe("Service functions", () => {
  test("Add Service (Admin/Maker)", async () => {
    const { t, tAera } = await setupUsers();

    await tAera.mutation(api.services.mutate.addService, {
      name: "3d printing",
      images: [],
      description: "printing services",
      type: "printing",
      status: "Available",
    });

    await t.run(async (ctx) => {
      const service = await ctx.db.query("services").collect();

      expect(service.length).toBe(1);
      expect(service[0].name).toBe("3d printing");
      expect(service[0].description).toBe("printing services");
      expect(service[0].type).toBe("printing");
      expect(service[0].status).toBe("Available");
    });
  });

  test("Add Service (Non-admin/Maker)", async () => {
    const { t, tHarley } = await setupUsers();

    await expect(async () => {
      await t.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        description: "printing services",
        type: "printing",
        status: "Available",
      });
    }).rejects.toThrowError("No identity!");

    await expect(async () => {
      await tHarley.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        description: "printing services",
        type: "printing",
        status: "Available",
      });
    }).rejects.toThrowError("Unauthorized. Cannot add service.");
  });

  test("Update Service (Admin/Maker)", async () => {});
  test("Update Service (Non-admin/Maker)", async () => {});

  test("Remove Service (Admin/Maker)", async () => {});
  test("Remove Service (Non-admin/Maker)", async () => {});
});
