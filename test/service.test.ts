import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import { flushScheduledFunctions, setupUsers } from "./helper";

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const HOUR_MS = 1000 * 60 * 60;

type TestHarness = Awaited<ReturnType<typeof setupUsers>>;

async function createTrackedFile(
  t: TestHarness["t"],
  originalName: string,
  type = "image/png",
) {
  const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type });
  const storageId = await t.run(async (ctx) => {
    const nextStorageId = await ctx.storage.store(blob);
    await ctx.db.insert("files", {
      originalName,
      storageId: nextStorageId,
      type,
      status: "orphaned",
    });
    return nextStorageId;
  });

  return { blob, storageId };
}

describe("Service mutations and queries", () => {
  describe("Fabrication services", () => {
    test("default available days to every day and expose linked materials and machines", async () => {
      const { t, tAera } = await setupUsers();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Laser Cutter",
        category: "machine",
        type: "CO2",
        images: [],
        description: "Precision cutting machine",
        status: "Available",
      });
      const resourceId = await t.run(async (ctx) => {
        const resources = await ctx.db.query("resources").collect();
        return resources.find((resource) => resource.name === "Laser Cutter")!
          ._id;
      });

      const materialId = await tAera.mutation(
        api.materials.mutate.addMaterial,
        {
          name: "Acrylic Sheet",
          category: "Sheets",
          unit: "sheet",
          currentStock: 15,
          costPerUnit: 80,
          pricePerUnit: 120,
          reorderThreshold: 3,
          status: "IN_STOCK",
        },
      );

      const { storageId: imageId } = await createTrackedFile(
        t,
        "service-image.png",
      );
      const { storageId: sampleId } = await createTrackedFile(
        t,
        "service-sample.png",
      );

      await tAera.mutation(api.services.mutate.addService, {
        name: "Laser Cutting",
        images: [imageId],
        samples: [sampleId],
        serviceCategory: {
          type: "FABRICATION",
          materials: [materialId],
          setupFee: 50,
          unitName: "hour",
          timeRate: 20,
        },
        requirements: ["vector file"],
        fileTypes: ["svg"],
        description: "Precision laser cutting",
        resources: [resourceId],
        status: "Available",
      });

      const service = await t.run(async (ctx) => {
        const docs = await ctx.db.query("services").collect();
        expect(docs).toHaveLength(1);
        return docs[0];
      });

      expect(service.slug).toBe("laser-cutting");
      expect(service.resources).toEqual([resourceId]);
      expect(service.serviceCategory).toMatchObject({
        type: "FABRICATION",
        availableDays: EVERY_DAY,
        materials: [materialId],
        setupFee: 50,
        unitName: "hour",
        timeRate: 20,
      });

      await t.run(async (ctx) => {
        const imageFile = await ctx.db
          .query("files")
          .withIndex("by_storageId", (q) => q.eq("storageId", imageId))
          .first();
        const sampleFile = await ctx.db
          .query("files")
          .withIndex("by_storageId", (q) => q.eq("storageId", sampleId))
          .first();

        expect(imageFile?.status).toBe("claimed");
        expect(sampleFile?.status).toBe("claimed");
      });

      const services = await t.query(api.services.query.getServices, {});
      expect(services).toHaveLength(1);
      expect(services[0].serviceCategory).toMatchObject({
        type: "FABRICATION",
        availableDays: EVERY_DAY,
      });
      expect(services[0].imageUrls).toHaveLength(1);

      const details = await t.query(api.services.query.getService, {
        slug: "laser-cutting",
      });

      expect(details).not.toBeNull();
      expect(details).toMatchObject({
        _id: service._id,
        resources: [resourceId],
        resourceDetails: [
          {
            _id: resourceId,
            name: "Laser Cutter",
            category: "machine",
            type: "CO2",
            status: "Available",
            description: "Precision cutting machine",
          },
        ],
        materialDetails: [
          {
            _id: materialId,
            name: "Acrylic Sheet",
            category: "Sheets",
            unit: "sheet",
            pricePerUnit: 120,
            costPerUnit: 80,
            currentStock: 15,
            status: "IN_STOCK",
          },
        ],
        serviceCategory: {
          type: "FABRICATION",
          availableDays: EVERY_DAY,
          materials: [materialId],
        },
      });
      expect(details?.imageUrls).toHaveLength(1);
      expect(details?.sampleUrls).toHaveLength(1);
    });

    test("updates linked machines and fabrication settings while keeping available days normalized", async () => {
      const { t, tAera } = await setupUsers();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Laser Cutter",
        category: "machine",
        type: "CO2",
        images: [],
        description: "Primary cutter",
        status: "Available",
      });
      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Fiber Laser",
        category: "machine",
        type: "Fiber",
        images: [],
        description: "Secondary cutter",
        status: "Under Maintenance",
      });
      const { firstMachineId, secondMachineId } = await t.run(async (ctx) => {
        const resources = await ctx.db.query("resources").collect();
        return {
          firstMachineId: resources.find(
            (resource) => resource.name === "Laser Cutter",
          )!._id,
          secondMachineId: resources.find(
            (resource) => resource.name === "Fiber Laser",
          )!._id,
        };
      });

      const firstMaterialId = await tAera.mutation(
        api.materials.mutate.addMaterial,
        {
          name: "Acrylic Sheet",
          category: "Sheets",
          unit: "sheet",
          currentStock: 15,
          pricePerUnit: 120,
          reorderThreshold: 3,
          status: "IN_STOCK",
        },
      );
      const secondMaterialId = await tAera.mutation(
        api.materials.mutate.addMaterial,
        {
          name: "Plywood",
          category: "Sheets",
          unit: "sheet",
          currentStock: 9,
          costPerUnit: 50,
          pricePerUnit: 90,
          reorderThreshold: 2,
          status: "LOW_STOCK",
        },
      );

      await tAera.mutation(api.services.mutate.addService, {
        name: "Laser Cutting",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          availableDays: [1, 3, 5],
          materials: [firstMaterialId],
          setupFee: 50,
          unitName: "hour",
          timeRate: 20,
        },
        requirements: ["vector file"],
        fileTypes: ["svg"],
        description: "Precision laser cutting",
        resources: [firstMachineId],
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await tAera.mutation(api.services.mutate.updateService, {
        service: serviceId,
        name: "Advanced Laser Cutting",
        description: "Supports wood and acrylic",
        status: "Unavailable",
        requirements: ["vector file", "material plan"],
        fileTypes: ["svg", "dxf"],
        resources: [secondMachineId],
        serviceCategory: {
          type: "FABRICATION",
          materials: [secondMaterialId],
          setupFee: 60,
          unitName: "hour",
          timeRate: 25,
          availableDays: [],
        },
      });

      const details = await t.query(api.services.query.getService, {
        slug: "advanced-laser-cutting",
      });

      expect(details).not.toBeNull();
      expect(details).toMatchObject({
        _id: serviceId,
        name: "Advanced Laser Cutting",
        description: "Supports wood and acrylic",
        status: "Unavailable",
        requirements: ["vector file", "material plan"],
        fileTypes: ["svg", "dxf"],
        resources: [secondMachineId],
        resourceDetails: [
          {
            _id: secondMachineId,
            name: "Fiber Laser",
            category: "machine",
            type: "Fiber",
            status: "Under Maintenance",
            description: "Secondary cutter",
          },
        ],
        materialDetails: [
          {
            _id: secondMaterialId,
            name: "Plywood",
            category: "Sheets",
            unit: "sheet",
            pricePerUnit: 90,
            costPerUnit: 50,
            currentStock: 9,
            status: "LOW_STOCK",
          },
        ],
        serviceCategory: {
          type: "FABRICATION",
          availableDays: EVERY_DAY,
          materials: [secondMaterialId],
          setupFee: 60,
          unitName: "hour",
          timeRate: 25,
        },
      });
    });

    test("rejects duplicate slugs on add and update", async () => {
      const { t, tAera } = await setupUsers();

      await tAera.mutation(api.services.mutate.addService, {
        name: "Laser Cutting",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          setupFee: 50,
          unitName: "hour",
          timeRate: 20,
        },
        requirements: ["vector file"],
        fileTypes: ["svg"],
        description: "Precision laser cutting",
        status: "Available",
      });

      await expect(
        tAera.mutation(api.services.mutate.addService, {
          name: "laser cutting",
          images: [],
          samples: [],
          serviceCategory: {
            type: "FABRICATION",
            setupFee: 40,
            unitName: "hour",
            timeRate: 18,
          },
          requirements: ["vector file"],
          fileTypes: ["svg"],
          description: "Duplicate slug",
          status: "Available",
        }),
      ).rejects.toThrow(
        'A service with the slug "laser-cutting" already exists.',
      );

      await tAera.mutation(api.services.mutate.addService, {
        name: "3D Printing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          setupFee: 20,
          unitName: "hour",
          timeRate: 10,
        },
        requirements: ["model file"],
        fileTypes: ["stl"],
        description: "Printer service",
        status: "Available",
      });

      const services = await t.run(async (ctx) =>
        ctx.db.query("services").collect(),
      );

      await expect(
        tAera.mutation(api.services.mutate.updateService, {
          service: services[1]._id,
          name: "Laser Cutting",
        }),
      ).rejects.toThrow(
        'A service with the slug "laser-cutting" already exists.',
      );
    });
  });

  describe("Workshop services", () => {
    test("initializes workshop schedule slot usage to zero", async () => {
      const { t, tAera } = await setupUsers();

      const scheduleDate = Date.UTC(2026, 5, 15);

      await tAera.mutation(api.services.mutate.addService, {
        name: "Intro to Laser Cutting",
        images: [],
        samples: [],
        serviceCategory: {
          type: "WORKSHOP",
          amount: 750,
          schedules: [
            {
              date: scheduleDate,
              timeSlots: [
                {
                  startTime: scheduleDate + 9 * HOUR_MS,
                  endTime: scheduleDate + 11 * HOUR_MS,
                  maxSlots: 8,
                },
              ],
            },
          ],
        },
        requirements: ["registration"],
        fileTypes: [],
        description: "Workshop on safe laser operation",
        status: "Available",
      });

      const service = await t.run(async (ctx) =>
        ctx.db.query("services").first(),
      );

      expect(service?.serviceCategory).toMatchObject({
        type: "WORKSHOP",
        amount: 750,
        schedules: [
          {
            date: scheduleDate,
            timeSlots: [
              {
                startTime: scheduleDate + 9 * HOUR_MS,
                endTime: scheduleDate + 11 * HOUR_MS,
                maxSlots: 8,
                usedUpSlots: 0,
              },
            ],
          },
        ],
      });
    });

    test("preserves used workshop slots on update and rejects shrinking below usage", async () => {
      const { t, tAera } = await setupUsers();

      const scheduleDate = Date.UTC(2026, 5, 20);

      await tAera.mutation(api.services.mutate.addService, {
        name: "Intro to 3D Printing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "WORKSHOP",
          amount: 500,
          schedules: [
            {
              date: scheduleDate,
              timeSlots: [
                {
                  startTime: scheduleDate + 13 * HOUR_MS,
                  endTime: scheduleDate + 15 * HOUR_MS,
                  maxSlots: 6,
                },
              ],
            },
          ],
        },
        requirements: ["registration"],
        fileTypes: [],
        description: "Workshop on 3D printing basics",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await t.run(async (ctx) => {
        const service = await ctx.db.get(serviceId);
        if (!service || service.serviceCategory.type !== "WORKSHOP") {
          throw new Error("Expected a workshop service");
        }

        await ctx.db.patch(serviceId, {
          serviceCategory: {
            ...service.serviceCategory,
            schedules: [
              {
                date: scheduleDate,
                timeSlots: [
                  {
                    startTime: scheduleDate + 13 * HOUR_MS,
                    endTime: scheduleDate + 15 * HOUR_MS,
                    maxSlots: 6,
                    usedUpSlots: 3,
                  },
                ],
              },
            ],
          },
        });
      });

      await tAera.mutation(api.services.mutate.updateService, {
        service: serviceId,
        serviceCategory: {
          type: "WORKSHOP",
          amount: 650,
          schedules: [
            {
              date: scheduleDate,
              timeSlots: [
                {
                  startTime: scheduleDate + 13 * HOUR_MS,
                  endTime: scheduleDate + 15 * HOUR_MS,
                  maxSlots: 7,
                },
                {
                  startTime: scheduleDate + 15 * HOUR_MS,
                  endTime: scheduleDate + 17 * HOUR_MS,
                  maxSlots: 4,
                },
              ],
            },
          ],
        },
      });

      const updatedService = await t.run(async (ctx) => ctx.db.get(serviceId));
      if (
        !updatedService ||
        updatedService.serviceCategory.type !== "WORKSHOP"
      ) {
        throw new Error("Expected updated workshop service");
      }

      expect(updatedService.serviceCategory.schedules).toEqual([
        {
          date: scheduleDate,
          timeSlots: [
            {
              startTime: scheduleDate + 13 * HOUR_MS,
              endTime: scheduleDate + 15 * HOUR_MS,
              maxSlots: 7,
              usedUpSlots: 3,
            },
            {
              startTime: scheduleDate + 15 * HOUR_MS,
              endTime: scheduleDate + 17 * HOUR_MS,
              maxSlots: 4,
              usedUpSlots: 0,
            },
          ],
        },
      ]);

      await expect(
        tAera.mutation(api.services.mutate.updateService, {
          service: serviceId,
          serviceCategory: {
            type: "WORKSHOP",
            amount: 650,
            schedules: [
              {
                date: scheduleDate,
                timeSlots: [
                  {
                    startTime: scheduleDate + 13 * HOUR_MS,
                    endTime: scheduleDate + 15 * HOUR_MS,
                    maxSlots: 2,
                  },
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow("Cannot reduce max slots below used up slots (3)");
    });
  });

  describe("Authorization and deletion", () => {
    test("rejects add and update for non-admins", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await expect(
        t.mutation(api.services.mutate.addService, {
          name: "3D Printing",
          images: [],
          samples: [],
          serviceCategory: {
            type: "FABRICATION",
            setupFee: 20,
            unitName: "hour",
            timeRate: 10,
          },
          requirements: ["model"],
          fileTypes: ["stl"],
          description: "Printer service",
          status: "Available",
        }),
      ).rejects.toThrow("Unauthenticated call");

      await expect(
        tHarley.mutation(api.services.mutate.addService, {
          name: "3D Printing",
          images: [],
          samples: [],
          serviceCategory: {
            type: "FABRICATION",
            setupFee: 20,
            unitName: "hour",
            timeRate: 10,
          },
          requirements: ["model"],
          fileTypes: ["stl"],
          description: "Printer service",
          status: "Available",
        }),
      ).rejects.toThrow(
        "Unauthorized: You do not have the correct permissions to mutate.",
      );

      await tAera.mutation(api.services.mutate.addService, {
        name: "Laser Cutting",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          setupFee: 50,
          unitName: "hour",
          timeRate: 20,
        },
        requirements: ["vector file"],
        fileTypes: ["svg"],
        description: "Laser cutter",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await expect(
        tHarley.mutation(api.services.mutate.updateService, {
          service: serviceId,
          name: "Updated Laser Cutting",
        }),
      ).rejects.toThrow(
        "Unauthorized: You do not have the correct permissions to mutate.",
      );
    });

    test("deletes services and attached files, and blocks unauthorized deletion", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      const { storageId: imageId } = await createTrackedFile(
        t,
        "deletable-image.png",
      );
      const { storageId: sampleId } = await createTrackedFile(
        t,
        "deletable-sample.png",
      );

      await tAera.mutation(api.services.mutate.addService, {
        name: "3D Printing",
        images: [imageId],
        samples: [sampleId],
        serviceCategory: {
          type: "FABRICATION",
          setupFee: 20,
          unitName: "hour",
          timeRate: 10,
        },
        requirements: ["model"],
        fileTypes: ["stl"],
        description: "Printer service",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await expect(
        tHarley.mutation(api.services.mutate.deleteService, {
          service: serviceId,
        }),
      ).rejects.toThrow(
        "Unauthorized: You do not have the correct permissions to mutate.",
      );

      await tAera.mutation(api.services.mutate.deleteService, {
        service: serviceId,
      });

      await t.run(async (ctx) => {
        const services = await ctx.db.query("services").collect();
        expect(services).toHaveLength(0);
      });

      const [imageFile, sampleFile] = await Promise.all([
        t.run(async (ctx) => ctx.storage.get(imageId)),
        t.run(async (ctx) => ctx.storage.get(sampleId)),
      ]);

      expect(imageFile).toBeNull();
      expect(sampleFile).toBeNull();
    });
  });

  describe("Resource and booking integration", () => {
    test("integrates service bookings with machine resources across service and resource queries", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Prusa XL",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Large-format printer",
        status: "Available",
      });
      const machineId = await t.run(async (ctx) => {
        const resources = await ctx.db.query("resources").collect();
        return resources.find((resource) => resource.name === "Prusa XL")!._id;
      });

      const materialId = await tAera.mutation(
        api.materials.mutate.addMaterial,
        {
          name: "PLA",
          category: "Filament",
          unit: "g",
          currentStock: 5000,
          pricePerUnit: 2,
          reorderThreshold: 500,
          status: "IN_STOCK",
        },
      );

      await tAera.mutation(api.services.mutate.addService, {
        name: "3D Printing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [materialId],
          setupFee: 1,
          unitName: "hour",
          timeRate: 2,
        },
        requirements: ["model"],
        fileTypes: ["stl"],
        description: "Printer service",
        resources: [machineId],
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const bookingDay = Date.UTC(2026, 5, 25);
      const bookingStart = bookingDay + 10 * HOUR_MS;
      const bookingEnd = bookingStart + 2 * HOUR_MS;

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "Printer job",
          pricing: "Default",
          description: "Prototype print",
          fulfillmentMode: "self-service",
          material: "buy-from-lab",
          requestedMaterials: [materialId],
          files: [],
          service: serviceId,
          notes: "Use the XL machine",
          booking: {
            startTime: bookingStart,
            endTime: bookingEnd,
            date: bookingDay,
          },
        },
      );

      await flushScheduledFunctions(t);

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        resourceId: machineId,
      });

      const serviceDetails = await t.query(api.services.query.getService, {
        slug: "3d-printing",
      });
      expect(serviceDetails?.resourceDetails).toEqual([
        {
          _id: machineId,
          name: "Prusa XL",
          category: "machine",
          type: "3D printer",
          status: "Available",
          description: "Large-format printer",
        },
      ]);

      const bookedTimeSlots = await t.query(
        api.services.query.getBookedTimeSlots,
        {
          serviceId,
          date: bookingDay,
        },
      );
      expect(bookedTimeSlots).toEqual([
        { startTime: bookingStart, endTime: bookingEnd },
      ]);

      const bookings = await tHarley.query(api.resource.query.getBookings, {
        date: bookingDay,
      });
      expect(bookings).toHaveLength(1);
      expect(bookings[0]).toMatchObject({
        projectId,
        resource: {
          _id: machineId,
          name: "Prusa XL",
          category: "machine",
          type: "3D printer",
          description: "Large-format printer",
          status: "Available",
        },
        service: {
          _id: serviceId,
          name: "3D Printing",
        },
      });
    });
  });
});
