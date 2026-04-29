import { describe, expect, test } from "vitest";
import { flushScheduledFunctions, setupProject, setupUsers } from "./helper";
import { api, internal } from "../convex/_generated/api";
import { syncProjectTotalInvoice } from "../convex/projects/helper";

const HOUR_MS = 1000 * 60 * 60;

describe("Project and Chat functionality", () => {
  describe("Project initialization", () => {
    test("Fabrication project initialization", async () => {
      const { t, serviceId } = await setupProject();

      await t.run(async (ctx) => {
        // get the userProfiles
        const userHarley = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "1"))
          .first();

        expect(userHarley);

        const userAera = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "2"))
          .first();

        expect(userAera);

        // Check if project was added
        const project = await ctx.db.query("projects").collect();
        expect(project.length).toBe(1);
        expect(project[0].name).toBe("test");
        expect(project[0].status).toBe("pending");
        expect(project[0].userId).toBe(userHarley!._id);
        expect(project[0].service).toBe(serviceId);
        expect(project[0].totalInvoice).toEqual({
          subtotal: 2,
          tax: 0,
          total: 2,
        });
        expect(project[0].pricingSnapshot).toEqual({
          setupFee: 0,
          timeCost: 2,
          materialCost: 0,
          total: 2,
          duration: 1,
          rate: 2,
          unitName: "hour",
        });

        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", project[0]._id))
          .first();

        expect(usage).toMatchObject({
          projectId: project[0]._id,
          service: serviceId,
          snapshot: {
            name: "3d printing",
            costAtTime: 2,
            unit: "hour",
          },
        });

        // Check if the room was added
        const room = await ctx.db.query("rooms").collect();
        expect(room.length).toBe(1);
        expect(room[0].color).toBe("yellow");
        expect(room[0].name).toBe("Harley");

        // check room members
        const members = await ctx.db.query("roomMembers").collect();
        expect(members.length).toBe(2);
        expect(members[0].roomId).toBe(room[0]._id);
        expect(members[0].participantId).toBe(userHarley!._id);
        expect(members[1].participantId).toBe(userAera!._id);

        // check thread
        const thread = await ctx.db.query("threads").collect();
        expect(thread.length).toBe(2);
        expect(thread[0].roomId).toBe(room[0]._id);
        expect(thread[0].title).toBe("General");

        expect(thread[1].roomId).toBe(room[0]._id);
        expect(thread[1].projectId).toBe(project[0]._id);

        // check chat
        const message = await ctx.db.query("messages").collect();
        expect(message.length).toBe(2);
        expect(message[0].room).toBe(room[0]._id);
        expect(message[0].threadId).toBe(thread[0]._id);
        expect(message[0].sender).toBe("System");
        expect(message[0].content).toBe(
          "Welcome to Harley! This is your main room for general inquiries.",
        );

        expect(message[1].room).toBe(room[0]._id);
        expect(message[1].threadId).toBe(thread[1]._id);
        expect(message[1].sender).toBe("System");
        expect(message[1].content).toContain("New project created: test");
      });
    });

    test("Fabrication creation syncs project, usage, and project query pricing", async () => {
      const { t, tHarley, projectId, serviceId } = await setupProject();

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      const list = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();

        expect(project!.type).toBe("FABRICATION");
        expect(project!.status).toBe("pending");
        expect(project!.service).toBe(serviceId);
        expect(project!.totalInvoice).toEqual({
          subtotal: 2,
          tax: 0,
          total: 2,
        });
        expect(project!.pricingSnapshot).toEqual({
          setupFee: 0,
          timeCost: 2,
          materialCost: 0,
          total: 2,
          duration: 1,
          rate: 2,
          unitName: "hour",
        });

        expect(usage).toMatchObject({
          projectId,
          service: serviceId,
          snapshot: {
            name: "3d printing",
            costAtTime: 2,
            unit: "hour",
          },
        });
      });

      expect(details.totalInvoice).toEqual({
        subtotal: 2,
        tax: 0,
        total: 2,
      });
      expect(details.pricingSnapshot).toEqual({
        setupFee: 0,
        timeCost: 2,
        materialCost: 0,
        total: 2,
        duration: 1,
        rate: 2,
        unitName: "hour",
      });
      expect(details.resourceUsages).toHaveLength(1);
      expect(details.resourceUsages[0].snapshot.costAtTime).toBe(2);
      expect(list.page[0].estimatedPrice).toBe(2);
    });

    test("Workshop project initialization", async () => {
      const { t, tAera, tHarley } = await setupUsers();
      const date = Date.now() + 72 * HOUR_MS;
      const startTime = date + 2 * HOUR_MS;
      const endTime = startTime + 2 * HOUR_MS;

      await tAera.mutation(api.services.mutate.addService, {
        name: "laser workshop",
        images: [],
        samples: [],
        serviceCategory: {
          type: "WORKSHOP",
          amount: 500,
          variants: [{ name: "Student", amount: 350 }],
          schedules: [
            {
              date,
              timeSlots: [{ startTime, endTime, maxSlots: 2 }],
            },
          ],
        },
        requirements: [],
        fileTypes: [],
        description: "laser cutting basics",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "workshop invoice",
          pricing: "Student",
          description: "learn the workflow",
          fulfillmentMode: "staff-led",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "first session",
          booking: { startTime, endTime, date },
        },
      );

      await flushScheduledFunctions(t);

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      const list = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
      });

      await t.run(async (ctx) => {
        const userHarley = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "1"))
          .first();
        const userAera = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "2"))
          .first();
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        const service = await ctx.db.get(serviceId);
        const room = await ctx.db.query("rooms").collect();
        const members = await ctx.db.query("roomMembers").collect();
        const thread = await ctx.db.query("threads").collect();
        const message = await ctx.db.query("messages").collect();

        expect(project!.type).toBe("WORKSHOP");
        expect(project!.totalInvoice).toEqual({
          subtotal: 350,
          tax: 0,
          total: 350,
        });
        expect(project!.pricingSnapshot).toEqual({
          setupFee: 350,
          timeCost: 0,
          materialCost: 0,
          total: 350,
          duration: 0,
          rate: 0,
          unitName: "unit",
        });

        expect(usage).toMatchObject({
          projectId,
          service: serviceId,
          snapshot: {
            name: "laser workshop",
            costAtTime: 350,
            unit: "session",
          },
        });

        expect(service?.serviceCategory.type).toBe("WORKSHOP");
        if (!service || service.serviceCategory.type !== "WORKSHOP") {
          throw new Error("Expected workshop service");
        }
        expect(
          service.serviceCategory.schedules[0].timeSlots[0].usedUpSlots,
        ).toBe(1);

        expect(room.length).toBe(1);
        expect(room[0].color).toBe("yellow");
        expect(room[0].name).toBe("Harley");

        expect(members.length).toBe(2);
        expect(members[0].roomId).toBe(room[0]._id);
        expect(members[0].participantId).toBe(userHarley!._id);
        expect(members[1].participantId).toBe(userAera!._id);

        expect(thread.length).toBe(2);
        expect(thread[0].roomId).toBe(room[0]._id);
        expect(thread[0].title).toBe("General");
        expect(thread[1].roomId).toBe(room[0]._id);
        expect(thread[1].projectId).toBe(projectId);

        expect(message.length).toBe(2);
        expect(message[0].room).toBe(room[0]._id);
        expect(message[0].threadId).toBe(thread[0]._id);
        expect(message[0].sender).toBe("System");
        expect(message[0].content).toBe(
          "Welcome to Harley! This is your main room for general inquiries.",
        );
        expect(message[1].room).toBe(room[0]._id);
        expect(message[1].threadId).toBe(thread[1]._id);
        expect(message[1].sender).toBe("System");
        expect(message[1].content).toContain(
          "New project created: workshop invoice",
        );
      });

      expect(details.totalInvoice).toEqual({
        subtotal: 350,
        tax: 0,
        total: 350,
      });
      expect(details.pricingSnapshot).toEqual({
        setupFee: 350,
        timeCost: 0,
        materialCost: 0,
        total: 350,
        duration: 0,
        rate: 0,
        unitName: "unit",
      });
      expect(details.resourceUsages).toHaveLength(1);
      expect(details.resourceUsages[0].snapshot.costAtTime).toBe(350);
      expect(details.resourceUsages[0].snapshot.unit).toBe("session");
      expect(list.page[0].estimatedPrice).toBe(350);
    });
  });

  describe("Project chat and lifecycle", () => {
    test("Chat messaging", async () => {
      const { t, tAera, tHarley, roomId, threadId } = await setupProject();

      await tAera.mutation(api.chat.mutate.sendMessage, {
        content: "Hello this project...",
        room: roomId,
        threadId,
      });

      await tHarley.mutation(api.chat.mutate.sendMessage, {
        content: "Hello Aera",
        room: roomId,
        threadId,
      });

      await t.run(async (ctx) => {
        const userAera = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "2"))
          .first();

        const userHarley = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "1"))
          .first();

        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        expect(messages).toHaveLength(3);
        expect(messages[0].sender).toBe("System");
        expect(messages[1].sender).toBe(userAera!._id);
        expect(messages[2].sender).toBe(userHarley!._id);

        expect(messages[1].content).toBe("Hello this project...");
        expect(messages[2].content).toBe("Hello Aera");
      });
    });

    test("Cancelling a workshop project clears invoice summary when usage is removed", async () => {
      const { t, tAera, tHarley } = await setupUsers();
      const date = Date.now() + 48 * HOUR_MS;
      const startTime = date + HOUR_MS;
      const endTime = startTime + HOUR_MS;

      await tAera.mutation(api.services.mutate.addService, {
        name: "cnc workshop",
        images: [],
        samples: [],
        serviceCategory: {
          type: "WORKSHOP",
          amount: 400,
          schedules: [
            {
              date,
              timeSlots: [{ startTime, endTime, maxSlots: 5 }],
            },
          ],
        },
        requirements: [],
        fileTypes: [],
        description: "intro to cnc",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "cancelled workshop",
          pricing: "Default",
          description: "booked then cancelled",
          fulfillmentMode: "staff-led",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "cannot attend",
          booking: { startTime, endTime, date },
        },
      );

      await flushScheduledFunctions(t);

      await tHarley.mutation(api.projects.mutate.cancelOwnProject, {
        projectId,
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        const service = await ctx.db.get(serviceId);

        expect(project!.status).toBe("cancelled");
        expect(project!.totalInvoice).toBeUndefined();
        expect(usage).toBeNull();

        expect(service?.serviceCategory.type).toBe("WORKSHOP");
        if (!service || service.serviceCategory.type !== "WORKSHOP") {
          throw new Error("Expected workshop service");
        }
        expect(
          service.serviceCategory.schedules[0].timeSlots[0].usedUpSlots,
        ).toBe(0);
      });
    });

    test("Update Project (Privileged - Owner, Admin, Maker)", async () => {
      const { t, tAera, projectId } = await setupProject();

      await t.mutation(internal.users.createMaker, {
        userId: "3",
        email: "maker@gmail.com",
        name: "Maker",
      });

      const makerId = await t.run(async (ctx) => {
        const maker = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "3"))
          .first();
        return maker!._id;
      });

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });

      await flushScheduledFunctions(t);

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        expect(project!.status).toBe("approved");
        expect(project!.assignedMaker).toBe(makerId);
      });
    });

    test("Update Project (Non-privileged)", async () => {});
  });

  describe("Project pricing synchronization", () => {
    test("Fabrication variant pricing uses the chosen variant for provisional totals", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.services.mutate.addService, {
        name: "cnc routing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [],
          setupFee: 10,
          unitName: "hour",
          timeRate: 8,
          variants: [
            {
              name: "Student",
              setupFee: 4,
              timeRate: 3,
            },
          ],
        },
        requirements: ["vector file"],
        fileTypes: [],
        description: "cnc routing service",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "variant pricing",
          pricing: "Student",
          description: "routing a sign",
          fulfillmentMode: "full-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "use student rate",
          booking: {
            startTime: Date.now() + HOUR_MS,
            endTime: Date.now() + 3 * HOUR_MS,
            date: Date.now() + 24 * HOUR_MS,
          },
        },
      );

      await flushScheduledFunctions(t);

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();

        expect(project!.totalInvoice).toEqual({
          subtotal: 10,
          tax: 0,
          total: 10,
        });
        expect(usage!.snapshot.costAtTime).toBe(10);
      });
    });

    test("Update cost breakdown syncs material stock", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.materials.mutate.addMaterial, {
        name: "PLA",
        category: "Filament",
        unit: "g",
        currentStock: 100,
        pricePerUnit: 2,
        reorderThreshold: 10,
        status: "IN_STOCK",
      });

      const materialId = await t.run(async (ctx) => {
        const material = await ctx.db.query("materials").first();
        return material!._id;
      });

      await tAera.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [materialId],
          setupFee: 1,
          unitName: "hour",
          timeRate: 2,
        },
        requirements: ["design", "model"],
        fileTypes: [],
        description: "std to 3d printed model",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await tHarley.mutation(api.projects.mutate.createProject, {
        name: "stock sync",
        pricing: "Default",
        description: "hello",
        fulfillmentMode: "self-service",
        material: "buy-from-lab",
        requestedMaterials: [materialId],
        files: [],
        service: serviceId,
        notes: "pls na",
        booking: {
          startTime: Date.now() + 1000 * 60 * 60,
          endTime: Date.now() + 1000 * 60 * 60 * 2,
          date: Date.now() + 1000 * 60 * 60 * 24,
        },
      });

      await flushScheduledFunctions(t);

      const projectId = await t.run(async (ctx) => {
        const project = await ctx.db.query("projects").first();
        return project!._id;
      });

      await tAera.mutation(api.projects.mutate.updateCostBreakdown, {
        projectId,
        setupFee: 1,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 20,
        materialsUsed: [{ materialId, amountUsed: 10 }],
      });

      await t.run(async (ctx) => {
        const material = await ctx.db.get(materialId);
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db.query("resourceUsage").first();

        expect(material!.currentStock).toBe(90);
        expect(project!.totalInvoice).toEqual({
          subtotal: 23,
          tax: 0,
          total: 23,
        });
        expect(project!.pricingSnapshot).toEqual({
          setupFee: 1,
          timeCost: 2,
          materialCost: 20,
          total: 23,
          duration: 1,
          rate: 2,
          unitName: "hour",
        });
        expect(usage!.projectId).toBe(projectId);
        expect(usage!.service).toBe(serviceId);
        expect(usage!.snapshot.costAtTime).toBe(23);
        expect(usage!.materialsUsed).toEqual([
          {
            materialId,
            amountUsed: 10,
            snapshot: {
              name: "PLA",
              unit: "g",
              pricePerUnit: 2,
              costPerUnit: undefined,
            },
          },
        ]);
      });

      await tAera.mutation(api.projects.mutate.updateCostBreakdown, {
        projectId,
        setupFee: 1,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 6,
        materialsUsed: [{ materialId, amountUsed: 3 }],
      });

      await t.run(async (ctx) => {
        const material = await ctx.db.get(materialId);
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db.query("resourceUsage").first();

        expect(material!.currentStock).toBe(97);
        expect(project!.totalInvoice).toEqual({
          subtotal: 9,
          tax: 0,
          total: 9,
        });
        expect(project!.pricingSnapshot).toEqual({
          setupFee: 1,
          timeCost: 2,
          materialCost: 6,
          total: 9,
          duration: 1,
          rate: 2,
          unitName: "hour",
        });
        expect(usage!.snapshot.costAtTime).toBe(9);
        expect(usage!.materialsUsed).toEqual([
          {
            materialId,
            amountUsed: 3,
            snapshot: {
              name: "PLA",
              unit: "g",
              pricePerUnit: 2,
              costPerUnit: undefined,
            },
          },
        ]);
      });
    });

    test("Update cost breakdown rejects material totals that do not match the selected usage", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.materials.mutate.addMaterial, {
        name: "PLA",
        category: "Filament",
        unit: "g",
        currentStock: 100,
        pricePerUnit: 2,
        reorderThreshold: 10,
        status: "IN_STOCK",
      });

      const materialId = await t.run(async (ctx) => {
        const material = await ctx.db.query("materials").first();
        return material!._id;
      });

      await tAera.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [materialId],
          setupFee: 1,
          unitName: "hour",
          timeRate: 2,
        },
        requirements: ["design"],
        fileTypes: [],
        description: "std to 3d printed model",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await tHarley.mutation(api.projects.mutate.createProject, {
        name: "invalid material total",
        pricing: "Default",
        description: "hello",
        fulfillmentMode: "self-service",
        material: "buy-from-lab",
        requestedMaterials: [materialId],
        files: [],
        service: serviceId,
        notes: "pls na",
        booking: {
          startTime: Date.now() + HOUR_MS,
          endTime: Date.now() + 2 * HOUR_MS,
          date: Date.now() + 24 * HOUR_MS,
        },
      });

      const projectId = await t.run(async (ctx) => {
        const project = await ctx.db.query("projects").first();
        return project!._id;
      });

      await expect(
        tAera.mutation(api.projects.mutate.updateCostBreakdown, {
          projectId,
          setupFee: 1,
          duration: 1,
          rate: 2,
          timeCost: 2,
          materialCost: 5,
          materialsUsed: [{ materialId, amountUsed: 3 }],
        }),
      ).rejects.toThrow(
        "Material cost must match the selected materials and quantities.",
      );
    });

    test("Update cost breakdown persists overridden duration and rate even when the total stays the same", async () => {
      const { t, tAera, tHarley, projectId } = await setupProject();

      await tAera.mutation(api.projects.mutate.updateCostBreakdown, {
        projectId,
        setupFee: 250,
        duration: 12,
        rate: 10,
        timeCost: 120,
        materialCost: 0,
      });

      await tAera.mutation(api.projects.mutate.updateCostBreakdown, {
        projectId,
        setupFee: 250,
        duration: 24,
        rate: 5,
        timeCost: 120,
        materialCost: 0,
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

        expect(project!.totalInvoice).toEqual({
          subtotal: 370,
          tax: 0,
          total: 370,
        });
        expect(project!.pricingSnapshot).toEqual({
          setupFee: 250,
          timeCost: 120,
          materialCost: 0,
          total: 370,
          duration: 24,
          rate: 5,
          unitName: "hour",
        });
        expect(usage!.snapshot.costAtTime).toBe(370);
      });

      expect(details.totalInvoice).toEqual({
        subtotal: 370,
        tax: 0,
        total: 370,
      });
      expect(details.pricingSnapshot).toEqual({
        setupFee: 250,
        timeCost: 120,
        materialCost: 0,
        total: 370,
        duration: 24,
        rate: 5,
        unitName: "hour",
      });
    });

    test("Material assignment syncs invoice after removing consumed materials", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.materials.mutate.addMaterial, {
        name: "PLA",
        category: "Filament",
        unit: "g",
        currentStock: 100,
        pricePerUnit: 2,
        reorderThreshold: 10,
        status: "IN_STOCK",
      });

      const materialId = await t.run(async (ctx) => {
        const material = await ctx.db.query("materials").first();
        return material!._id;
      });

      await tAera.mutation(api.services.mutate.addService, {
        name: "3d printing",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [materialId],
          setupFee: 1,
          unitName: "hour",
          timeRate: 2,
        },
        requirements: ["design", "model"],
        fileTypes: [],
        description: "std to 3d printed model",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      await tHarley.mutation(api.projects.mutate.createProject, {
        name: "material sync",
        pricing: "Default",
        description: "hello",
        fulfillmentMode: "self-service",
        material: "buy-from-lab",
        requestedMaterials: [materialId],
        files: [],
        service: serviceId,
        notes: "pls na",
        booking: {
          startTime: Date.now() + HOUR_MS,
          endTime: Date.now() + 2 * HOUR_MS,
          date: Date.now() + 24 * HOUR_MS,
        },
      });

      const projectId = await t.run(async (ctx) => {
        const project = await ctx.db.query("projects").first();
        return project!._id;
      });

      await tAera.mutation(api.projects.mutate.updateCostBreakdown, {
        projectId,
        setupFee: 0,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 8,
        materialsUsed: [{ materialId, amountUsed: 4 }],
      });

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        materialIds: [],
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        const material = await ctx.db.get(materialId);

        expect(project!.totalInvoice).toEqual({
          subtotal: 2,
          tax: 0,
          total: 2,
        });
        expect(usage!.snapshot.costAtTime).toBe(2);
        expect(usage!.materialsUsed).toEqual([]);
        expect(material!.currentStock).toBe(100);
      });
    });

    test("Multiple usages aggregate into project pricing across tables and queries", async () => {
      const { t, tHarley, projectId, serviceId } = await setupProject();
      const secondStart = Date.now() + 72 * HOUR_MS;
      const secondEnd = secondStart + 2 * HOUR_MS;
      const thirdStart = secondEnd + HOUR_MS;
      const thirdEnd = thirdStart + 3 * HOUR_MS;

      await t.run(async (ctx) => {
        await ctx.db.insert("resourceUsage", {
          projectId,
          service: serviceId,
          startTime: secondStart,
          endTime: secondEnd,
          snapshot: {
            name: "3d printing",
            costAtTime: 4,
            unit: "hour",
          },
        });

        await ctx.db.insert("resourceUsage", {
          projectId,
          service: serviceId,
          startTime: thirdStart,
          endTime: thirdEnd,
          snapshot: {
            name: "3d printing",
            costAtTime: 999,
            unit: "hour",
          },
        });

        await syncProjectTotalInvoice(ctx, projectId);
      });

      const projectDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );
      const projectList = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
      });

      expect(projectDetails.totalInvoice).toEqual({
        subtotal: 12,
        tax: 0,
        total: 12,
      });
      expect(projectDetails.resourceUsages).toHaveLength(3);
      expect(
        projectDetails.resourceUsages.reduce(
          (sum, usage) => sum + usage.snapshot.costAtTime,
          0,
        ),
      ).toBe(12);
      expect(projectList.page[0].estimatedPrice).toBe(12);
    });

    test("Updating usage records recalculates fabrication pricing and surfaces the edited usage", async () => {
      const { t, tAera, tHarley, projectId, serviceId } = await setupProject();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Prusa MK4",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Main print station",
        status: "Available",
      });

      const { firstUsageId, secondUsageId, resourceId } = await t.run(
        async (ctx) => {
          const firstUsage = await ctx.db
            .query("resourceUsage")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .first();

          const secondUsageId = await ctx.db.insert("resourceUsage", {
            projectId,
            service: serviceId,
            startTime: Date.now() + 96 * HOUR_MS,
            endTime: Date.now() + 98 * HOUR_MS,
            snapshot: {
              name: "3d printing",
              costAtTime: 0,
              unit: "hour",
            },
          });

          await syncProjectTotalInvoice(ctx, projectId);

          const resource = await ctx.db.query("resources").first();

          return {
            firstUsageId: firstUsage!._id,
            secondUsageId,
            resourceId: resource!._id,
          };
        },
      );

      const updatedStart = Date.now() + 120 * HOUR_MS;
      const updatedEnd = updatedStart + 3 * HOUR_MS;

      await tAera.mutation(api.resource.mutate.updateUsage, {
        id: firstUsageId,
        resource: resourceId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });

      const projectDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );

      const updatedUsage = projectDetails.resourceUsages.find(
        (usage) => usage._id === firstUsageId,
      );
      const unchangedUsage = projectDetails.resourceUsages.find(
        (usage) => usage._id === secondUsageId,
      );

      expect(projectDetails.totalInvoice).toEqual({
        subtotal: 10,
        tax: 0,
        total: 10,
      });
      expect(projectDetails.bookingStartTime).toBe(updatedStart);
      expect(projectDetails.bookingEndTime).toBe(updatedEnd);
      expect(updatedUsage).toMatchObject({
        _id: firstUsageId,
        resource: resourceId,
        startTime: updatedStart,
        endTime: updatedEnd,
        snapshot: {
          costAtTime: 6,
        },
        resourceDetails: {
          _id: resourceId,
          category: "machine",
          type: "3D printer",
          status: "Available",
        },
      });
      expect(unchangedUsage?.snapshot.costAtTime).toBe(4);
    });

    test("Invoice sync corrects stale usage snapshot totals from duration-based pricing", async () => {
      const { t, tHarley, projectId, serviceId } = await setupProject();

      const usageId = await t.run(async (ctx) => {
        const usageId = await ctx.db.insert("resourceUsage", {
          projectId,
          service: serviceId,
          startTime: Date.now() + 60 * HOUR_MS,
          endTime: Date.now() + 64 * HOUR_MS,
          snapshot: {
            name: "3d printing",
            costAtTime: 999,
            unit: "hour",
          },
        });

        await syncProjectTotalInvoice(ctx, projectId);
        return usageId;
      });

      const projectDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );

      expect(projectDetails.totalInvoice).toEqual({
        subtotal: 10,
        tax: 0,
        total: 10,
      });
      expect(
        projectDetails.resourceUsages.find((usage) => usage._id === usageId)
          ?.snapshot.costAtTime,
      ).toBe(8);
    });
  });

  describe("Project completion and cleanup", () => {
    test("Complete project syncs final invoice, usage snapshot, and material stock", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.materials.mutate.addMaterial, {
        name: "Acrylic",
        category: "Sheets",
        unit: "sheet",
        currentStock: 100,
        pricePerUnit: 2,
        reorderThreshold: 10,
        status: "IN_STOCK",
      });

      const materialId = await t.run(async (ctx) => {
        const material = await ctx.db.query("materials").first();
        return material!._id;
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

      await tHarley.mutation(api.projects.mutate.createProject, {
        name: "laser sign",
        pricing: "Default",
        description: "cut an acrylic sign",
        fulfillmentMode: "full-service",
        material: "buy-from-lab",
        requestedMaterials: [materialId],
        files: [],
        service: serviceId,
        notes: "use clear acrylic",
        booking: {
          startTime: Date.now() + HOUR_MS,
          endTime: Date.now() + 2 * HOUR_MS,
          date: Date.now() + 24 * HOUR_MS,
        },
      });

      await flushScheduledFunctions(t);

      const projectId = await t.run(async (ctx) => {
        const project = await ctx.db.query("projects").first();
        return project!._id;
      });

      await tAera.mutation(api.projects.mutate.completeProject, {
        projectId,
        actualDurationMs: 3 * HOUR_MS,
        materialsUsed: [{ materialId, amountUsed: 4 }],
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db.query("resourceUsage").first();
        const material = await ctx.db.get(materialId);

        expect(project!.status).toBe("completed");
        expect(project!.totalInvoice).toEqual({
          subtotal: 15,
          tax: 0,
          total: 15,
        });

        expect(usage!.projectId).toBe(projectId);
        expect(usage!.service).toBe(serviceId);
        expect(usage!.snapshot.costAtTime).toBe(15);
        expect(usage!.materialsUsed).toEqual([
          {
            materialId,
            amountUsed: 4,
            snapshot: {
              name: "Acrylic",
              unit: "sheet",
              pricePerUnit: 2,
              costPerUnit: undefined,
            },
          },
        ]);

        expect(material!.currentStock).toBe(96);
      });
    });

    test("Complete project with multiple usages applies setup fee once and avoids double counting", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.services.mutate.addService, {
        name: "laser cutting",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [],
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

      await tHarley.mutation(api.projects.mutate.createProject, {
        name: "multi session sign",
        pricing: "Default",
        description: "cut a sign in multiple sessions",
        fulfillmentMode: "full-service",
        material: "provide-own",
        files: [],
        service: serviceId,
        notes: "split across two sessions",
        booking: {
          startTime: Date.now() + HOUR_MS,
          endTime: Date.now() + 2 * HOUR_MS,
          date: Date.now() + 24 * HOUR_MS,
        },
      });

      const projectId = await t.run(async (ctx) => {
        const project = await ctx.db.query("projects").first();
        return project!._id;
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("resourceUsage", {
          projectId,
          service: serviceId,
          startTime: Date.now() + 48 * HOUR_MS,
          endTime: Date.now() + 50 * HOUR_MS,
          snapshot: {
            name: "laser cutting",
            costAtTime: 0,
            unit: "hour",
          },
        });
        await syncProjectTotalInvoice(ctx, projectId);
      });

      await tAera.mutation(api.projects.mutate.completeProject, {
        projectId,
        actualDurationMs: 6 * HOUR_MS,
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .collect();

        const sortedCosts = usages
          .map((usage) => usage.snapshot.costAtTime)
          .sort((a, b) => a - b);

        expect(project!.totalInvoice).toEqual({
          subtotal: 13,
          tax: 0,
          total: 13,
        });
        expect(sortedCosts).toEqual([5, 8]);
      });
    });

    test("Deleting resource usage clears the project's aggregate invoice", async () => {
      const { t, tAera, projectId } = await setupProject();

      const usageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      await tAera.mutation(api.resource.mutate.deleteUsage, { usage: usageId });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();

        expect(usage).toBeNull();
        expect(project!.totalInvoice).toBeUndefined();
      });
    });
  });
});
