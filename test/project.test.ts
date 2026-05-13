import { describe, expect, test } from "vitest";
import { flushScheduledFunctions, setupProject, setupUsers } from "./helper";
import { api, internal } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { syncProjectTotalInvoice } from "../convex/projects/helper";
import {
  addLabDays,
  addLabMonths,
  endOfLabMonth,
  endOfLabWeek,
  getLabDayStart,
  startOfLabMonth,
  startOfLabWeek,
} from "../src/lib/lab-time";

const HOUR_MS = 1000 * 60 * 60;
type TestConvex = Awaited<ReturnType<typeof setupUsers>>["t"];

async function withScheduledEmailsEnabled<T>(callback: () => Promise<T>) {
  const previousValue = process.env.DISABLE_SCHEDULED_EMAILS;
  process.env.DISABLE_SCHEDULED_EMAILS = "false";

  try {
    return await callback();
  } finally {
    if (previousValue === undefined) {
      delete process.env.DISABLE_SCHEDULED_EMAILS;
    } else {
      process.env.DISABLE_SCHEDULED_EMAILS = previousValue;
    }
  }
}

async function getScheduledJobs(t: TestConvex) {
  return t.run(async (ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );
}

async function captureNewScheduledJobs<T>(
  t: TestConvex,
  callback: () => Promise<T>,
) {
  const before = await getScheduledJobs(t);
  const beforeIds = new Set(before.map((job) => job._id));
  const result = await withScheduledEmailsEnabled(callback);
  const after = await getScheduledJobs(t);
  await flushScheduledFunctions(t);

  return {
    result,
    jobs: after.filter((job) => !beforeIds.has(job._id)),
  };
}

async function getProjectUsageId(t: TestConvex, projectId: Id<"projects">) {
  return t.run(async (ctx) => {
    const usage = await ctx.db
      .query("resourceUsage")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
    return usage!._id;
  });
}

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
          pricingSnapshot: {
            duration: 1,
            rate: 2,
            timeCost: 2,
            materialCost: 0,
            setupFeePortion: 0,
            subtotal: 2,
            unitName: "hour",
            pricingVariant: "UP",
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
          pricingSnapshot: {
            duration: 1,
            rate: 2,
            timeCost: 2,
            materialCost: 0,
            setupFeePortion: 0,
            subtotal: 2,
            unitName: "hour",
            pricingVariant: "UP",
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
          fulfillmentMode: "full-service",
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
          pricingSnapshot: {
            duration: 0,
            rate: 0,
            timeCost: 0,
            materialCost: 0,
            setupFeePortion: 350,
            subtotal: 350,
            unitName: "unit",
            pricingVariant: "Student",
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
      expect(details.resourceUsages[0].pricingSnapshot).toEqual({
        duration: 0,
        rate: 0,
        timeCost: 0,
        materialCost: 0,
        setupFeePortion: 350,
        subtotal: 350,
        unitName: "unit",
        pricingVariant: "Student",
      });
      expect(list.page[0].estimatedPrice).toBe(350);
    });
  });

  describe("Project update emails", () => {
    test("Updating usage pricing schedules a project update email", async () => {
      const { t, tAera, projectId } = await setupProject();
      const usageId = await getProjectUsageId(t, projectId);

      const { jobs } = await captureNewScheduledJobs(t, () =>
        tAera.mutation(api.projects.mutate.updateUsagePricing, {
          projectId,
          usageId,
          duration: 1,
          rate: 3,
          timeCost: 3,
          materialCost: 0,
          setupFeePortion: 1,
          unitName: "hour",
        }),
      );

      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.args[0]).toMatchObject({
        to: "delivered+harley@resend.dev",
        projectName: "test",
        status: "pending",
        pricing: {
          setupFee: 1,
          materialCost: 0,
          timeCost: 3,
          total: 4,
        },
      });
    });

    test("Moving a paid project to claimed schedules a claimed email", async () => {
      const { t, tAera, projectId } = await setupProject();

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await tAera.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "R-1001",
        paymentMode: "cash",
        proof: "Paid at the front desk",
      });

      const { jobs } = await captureNewScheduledJobs(t, () =>
        tAera.mutation(api.projects.mutate.updateProject, {
          projectId,
          status: "claimed",
        }),
      );

      // Two jobs: the claimed email + the scheduled thread archival
      expect(jobs).toHaveLength(2);

      // One of them is the email
      const emailJob = jobs.find((j) => j?.args[0]?.status === "claimed");
      expect(emailJob?.args[0]).toMatchObject({
        to: "delivered+harley@resend.dev",
        projectName: "test",
        status: "claimed",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        expect(project!.status).toBe("claimed");
      });
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

    test("System messages increase client unread counts after the client marks the room as read", async () => {
      const { t, tAera, tHarley, roomId, threadId, projectId } =
        await setupProject();

      const generalThreadId = await t.run(async (ctx) => {
        const threads = await ctx.db
          .query("threads")
          .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
          .collect();
        return threads.find((thread) => thread._id !== threadId)!._id;
      });

      await tHarley.mutation(api.chat.mutate.markThreadRead, {
        threadId: generalThreadId,
      });
      await tHarley.mutation(api.chat.mutate.markThreadRead, {
        threadId,
      });

      const roomsBefore = await tHarley.query(api.chat.query.getRooms, {});
      const roomBefore = roomsBefore.find((room) => room._id === roomId);
      const projectThreadBefore = roomBefore?.threads.find(
        (thread) => thread._id === threadId,
      );

      expect(roomBefore?.unreadCount).toBe(0);
      expect(projectThreadBefore?.unreadCount).toBe(0);

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });

      const roomsAfter = await tHarley.query(api.chat.query.getRooms, {});
      const roomAfter = roomsAfter.find((room) => room._id === roomId);
      const projectThreadAfter = roomAfter?.threads.find(
        (thread) => thread._id === threadId,
      );

      await t.run(async (ctx) => {
        const thread = await ctx.db.get(threadId);
        const room = await ctx.db.get(roomId);
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        expect(thread?.messageCount).toBe(2);
        expect(thread?.lastMessageText).toContain("Status updated to:");
        expect(room?.lastMessageText).toContain("Status updated to:");
        expect(messages).toHaveLength(2);
        expect(messages[1].sender).toBe("System");
        expect(messages[1].content).toContain("Status updated to:");
      });

      expect(roomAfter?.unreadCount).toBe(1);
      expect(projectThreadAfter?.unreadCount).toBe(1);
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
          fulfillmentMode: "full-service",
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
        expect(project!.pricingSnapshot).toBeUndefined();
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

    test("Cancelling a fabrication project releases usages and restores reserved material stock", async () => {
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

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "cancelled fabrication",
          pricing: "Default",
          description: "reserve then cancel",
          fulfillmentMode: "self-service",
          material: "buy-from-lab",
          materialIds: [materialId],
          files: [],
          service: serviceId,
          notes: "cancel later",
          booking: {
            startTime: Date.now() + HOUR_MS,
            endTime: Date.now() + 2 * HOUR_MS,
            date: Date.now() + 24 * HOUR_MS,
          },
        },
      );

      const usageId = await getProjectUsageId(t, projectId);

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 8,
        setupFeePortion: 0,
        unitName: "hour",
        materialsUsed: [{ materialId, amountUsed: 4 }],
      });

      await tHarley.mutation(api.projects.mutate.cancelOwnProject, {
        projectId,
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .collect();
        const material = await ctx.db.get(materialId);

        expect(project!.status).toBe("cancelled");
        expect(project!.totalInvoice).toBeUndefined();
        expect(project!.pricingSnapshot).toBeUndefined();
        expect(usages).toEqual([]);
        expect(material!.currentStock).toBe(100);
      });
    });

    test("Rejecting a workshop project releases usage, slot counts, and invoice state", async () => {
      const { t, tAera, tHarley } = await setupUsers();
      const date = Date.now() + 96 * HOUR_MS;
      const startTime = date + HOUR_MS;
      const endTime = startTime + HOUR_MS;

      await tAera.mutation(api.services.mutate.addService, {
        name: "rejected workshop",
        images: [],
        samples: [],
        serviceCategory: {
          type: "WORKSHOP",
          amount: 250,
          schedules: [
            {
              date,
              timeSlots: [{ startTime, endTime, maxSlots: 3 }],
            },
          ],
        },
        requirements: [],
        fileTypes: [],
        description: "rejectable workshop",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "reject me",
          pricing: "Default",
          description: "reserve then reject",
          fulfillmentMode: "full-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "reject later",
          booking: { startTime, endTime, date },
        },
      );

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "rejected",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        const service = await ctx.db.get(serviceId);

        expect(project!.status).toBe("rejected");
        expect(project!.totalInvoice).toBeUndefined();
        expect(project!.pricingSnapshot).toBeUndefined();
        expect(usage).toBeNull();

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

    test("Owning client can update pending project details", async () => {
      const { t, tHarley, projectId, threadId, roomId } = await setupProject();

      await tHarley.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        description: "updated by client",
        notes: "client note",
        material: "buy-from-lab",
        fulfillmentMode: "full-service",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        expect(project).toMatchObject({
          description: "updated by client",
          notes: "client note",
          material: "buy-from-lab",
          fulfillmentMode: "full-service",
        });
        expect(messages.at(-1)?.content).toBe(
          "Client updated: description, notes, material, fulfillment mode.",
        );
      });
    });

    test("Admin and maker can update pending project details", async () => {
      const { t, tAera, projectId, threadId, roomId } = await setupProject();

      await t.mutation(internal.users.createMaker, {
        userId: "3",
        email: "maker@gmail.com",
        name: "Maker",
      });
      const tMaker = t.withIdentity({ subject: "3", name: "Maker" });

      await tAera.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        description: "updated by admin",
        notes: "admin note",
      });

      await tMaker.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        material: "buy-from-lab",
        fulfillmentMode: "full-service",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        expect(project).toMatchObject({
          description: "updated by admin",
          notes: "admin note",
          material: "buy-from-lab",
          fulfillmentMode: "full-service",
        });
        expect(messages.at(-2)?.content).toBe(
          "Admin updated: description, notes.",
        );
        expect(messages.at(-1)?.content).toBe(
          "Maker updated: material, fulfillment mode.",
        );
      });
    });

    test("Admin and maker can update project details after review has started", async () => {
      const { t, tAera, projectId } = await setupProject();

      await t.mutation(internal.users.createMaker, {
        userId: "3",
        email: "maker@gmail.com",
        name: "Maker",
      });
      const tMaker = t.withIdentity({ subject: "3", name: "Maker" });

      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });

      await tAera.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        description: "updated after review by admin",
      });

      await tMaker.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        notes: "maker note after review",
        material: "buy-from-lab",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);

        expect(project).toMatchObject({
          status: "approved",
          description: "updated after review by admin",
          notes: "maker note after review",
          material: "buy-from-lab",
        });
      });
    });

    test("Other clients cannot update another client's project details", async () => {
      const { t, tHarley, projectId } = await setupProject();

      await t.mutation(internal.users.createUserProfile, {
        userId: "4",
        email: "other-client@gmail.com",
        name: "Other Client",
      });
      const tOtherClient = t.withIdentity({
        subject: "4",
        name: "Other Client",
      });

      await expect(
        tOtherClient.mutation(api.projects.mutate.updateOwnProjectDetails, {
          projectId,
          description: "unauthorized",
        }),
      ).rejects.toThrow("You do not own this project.");

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      expect(details.description).toBe("hello");
    });

    test("Workshop services accept supported fulfillment modes on creation and detail updates", async () => {
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
          name: "supported workshop mode",
          pricing: "Default",
          description: "allowed",
          fulfillmentMode: "full-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "okay",
          booking: { startTime, endTime, date },
        },
      );

      await t.mutation(internal.users.createMaker, {
        userId: "3",
        email: "maker@gmail.com",
        name: "Maker",
      });
      const tMaker = t.withIdentity({ subject: "3", name: "Maker" });

      await tHarley.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        fulfillmentMode: "self-service",
      });

      await tAera.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        fulfillmentMode: "full-service",
      });

      await tMaker.mutation(api.projects.mutate.updateOwnProjectDetails, {
        projectId,
        fulfillmentMode: "self-service",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        expect(project!.fulfillmentMode).toBe("self-service");
      });
    });
  });

  describe("Booking updates and permissions", () => {
    test("Client can update their own booking", async () => {
      const { t, tHarley, projectId } = await setupProject();
      const initialDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );

      const usageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      const updatedStart = Date.now() + 144 * HOUR_MS;
      const updatedEnd = updatedStart + 4 * HOUR_MS;

      await tHarley.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(details.bookingStartTime).toBe(initialDetails.bookingStartTime);
      expect(details.bookingEndTime).toBe(initialDetails.bookingEndTime);
      expect(details.resourceUsages[0]).toMatchObject({
        _id: usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });
    });

    test("Admin can update a booking", async () => {
      const { t, tAera, tHarley, projectId } = await setupProject();
      const initialDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );

      const usageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      const updatedStart = Date.now() + 168 * HOUR_MS;
      const updatedEnd = updatedStart + 5 * HOUR_MS;

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(details.bookingStartTime).toBe(initialDetails.bookingStartTime);
      expect(details.bookingEndTime).toBe(initialDetails.bookingEndTime);
      expect(details.resourceUsages[0]).toMatchObject({
        _id: usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });
    });

    test("Maker can update a booking", async () => {
      const { t, tHarley, projectId } = await setupProject();
      const initialDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );

      await t.mutation(internal.users.createMaker, {
        userId: "3",
        email: "maker@gmail.com",
        name: "Maker",
      });
      const tMaker = t.withIdentity({ subject: "3", name: "Maker" });

      const usageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      const updatedStart = Date.now() + 192 * HOUR_MS;
      const updatedEnd = updatedStart + 6 * HOUR_MS;

      await tMaker.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(details.bookingStartTime).toBe(initialDetails.bookingStartTime);
      expect(details.bookingEndTime).toBe(initialDetails.bookingEndTime);
      expect(details.resourceUsages[0]).toMatchObject({
        _id: usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });
    });

    test("Privileged users can create past usages when explicitly allowed", async () => {
      const { tAera, tHarley, projectId } = await setupProject();
      const pastStart = Date.now() - 6 * HOUR_MS;
      const pastEnd = pastStart + 2 * HOUR_MS;

      await expect(
        tAera.mutation(api.projects.mutate.createUsage, {
          projectId,
          startTime: pastStart,
          endTime: pastEnd,
        }),
      ).rejects.toThrow("Cannot book a date or time in the past.");

      const { usageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime: pastStart,
          endTime: pastEnd,
          allowPastBooking: true,
        },
      );

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(
        details.resourceUsages.find((usage) => usage._id === usageId),
      ).toMatchObject({
        _id: usageId,
        startTime: pastStart,
        endTime: pastEnd,
      });
    });

    test("Privileged users can move usages into the past when explicitly allowed", async () => {
      const { t, tAera, tHarley, projectId } = await setupProject();
      const usageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });
      const pastStart = Date.now() - 4 * HOUR_MS;
      const pastEnd = pastStart + 90 * 60 * 1000;

      await expect(
        tAera.mutation(api.projects.mutate.updateUsage, {
          projectId,
          usageId,
          startTime: pastStart,
          endTime: pastEnd,
        }),
      ).rejects.toThrow("Cannot book a date or time in the past.");

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId,
        startTime: pastStart,
        endTime: pastEnd,
        allowPastBooking: true,
      });

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(details.resourceUsages[0]).toMatchObject({
        _id: usageId,
        startTime: pastStart,
        endTime: pastEnd,
      });
    });

    test("Booking updates send a system message and increase client unread counts", async () => {
      const { t, tAera, tHarley, roomId, threadId, projectId } =
        await setupProject();

      const generalThreadId = await t.run(async (ctx) => {
        const threads = await ctx.db
          .query("threads")
          .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
          .collect();
        return threads.find((thread) => thread._id !== threadId)!._id;
      });

      const usageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      await tHarley.mutation(api.chat.mutate.markThreadRead, {
        threadId: generalThreadId,
      });
      await tHarley.mutation(api.chat.mutate.markThreadRead, {
        threadId,
      });

      const updatedStart = Date.now() + 216 * HOUR_MS;
      const updatedEnd = updatedStart + 3 * HOUR_MS;

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId,
        startTime: updatedStart,
        endTime: updatedEnd,
      });

      const roomsAfter = await tHarley.query(api.chat.query.getRooms, {});
      const roomAfter = roomsAfter.find((room) => room._id === roomId);
      const projectThreadAfter = roomAfter?.threads.find(
        (thread) => thread._id === threadId,
      );

      await t.run(async (ctx) => {
        const thread = await ctx.db.get(threadId);
        const room = await ctx.db.get(roomId);
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        expect(thread?.messageCount).toBe(2);
        expect(thread?.lastMessageText).toContain("Booking updated:");
        expect(room?.lastMessageText).toContain("Booking updated:");
        expect(messages).toHaveLength(2);
        expect(messages[1].sender).toBe("System");
        expect(messages[1].content).toContain("Booking updated:");
        expect(messages[1].content).toContain("Schedule:");
      });

      expect(roomAfter?.unreadCount).toBe(1);
      expect(projectThreadAfter?.unreadCount).toBe(1);
    });
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
        materialIds: [materialId],
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

      const usageId = await getProjectUsageId(t, projectId);

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 20,
        setupFeePortion: 1,
        unitName: "hour",
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
        expect(usage!.pricingSnapshot).toEqual({
          duration: 1,
          rate: 2,
          timeCost: 2,
          materialCost: 20,
          setupFeePortion: 1,
          subtotal: 23,
          unitName: "hour",
          pricingVariant: "Default",
        });
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

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 6,
        setupFeePortion: 1,
        unitName: "hour",
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
        expect(usage!.pricingSnapshot).toEqual({
          duration: 1,
          rate: 2,
          timeCost: 2,
          materialCost: 6,
          setupFeePortion: 1,
          subtotal: 9,
          unitName: "hour",
          pricingVariant: "Default",
        });
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

    test("Update usage pricing rejects material totals that do not match the selected usage", async () => {
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
        materialIds: [materialId],
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

      const usageId = await getProjectUsageId(t, projectId);

      await expect(
        tAera.mutation(api.projects.mutate.updateUsagePricing, {
          projectId,
          usageId,
          duration: 1,
          rate: 2,
          timeCost: 2,
          materialCost: 5,
          setupFeePortion: 1,
          unitName: "hour",
          materialsUsed: [{ materialId, amountUsed: 3 }],
        }),
      ).rejects.toThrow(
        "Material cost must match the selected materials and quantities.",
      );
    });

    test("Update usage pricing persists overridden duration and rate even when the total stays the same", async () => {
      const { t, tAera, tHarley, projectId } = await setupProject();
      const usageId = await getProjectUsageId(t, projectId);

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 12,
        rate: 10,
        timeCost: 120,
        materialCost: 0,
        setupFeePortion: 250,
        unitName: "hour",
      });

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 24,
        rate: 5,
        timeCost: 120,
        materialCost: 0,
        setupFeePortion: 250,
        unitName: "hour",
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
        expect(usage!.pricingSnapshot).toEqual({
          duration: 24,
          rate: 5,
          timeCost: 120,
          materialCost: 0,
          setupFeePortion: 250,
          subtotal: 370,
          unitName: "hour",
          pricingVariant: "UP",
        });
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

    test("Removing materials from a usage syncs invoice and restores stock", async () => {
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
        materialIds: [materialId],
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

      const usageId = await getProjectUsageId(t, projectId);

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 8,
        setupFeePortion: 0,
        unitName: "hour",
        materialsUsed: [{ materialId, amountUsed: 4 }],
      });

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 1,
        rate: 2,
        timeCost: 2,
        materialCost: 0,
        setupFeePortion: 0,
        unitName: "hour",
        materialsUsed: [],
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
      expect(
        projectDetails.resourceUsages
          .map((usage) => usage.pricingSnapshot?.subtotal)
          .sort((a, b) => (a ?? 0) - (b ?? 0)),
      ).toEqual([2, 4, 6]);
      expect(projectList.page[0].estimatedPrice).toBe(12);
    });

    test("Updating usage records recalculates fabrication pricing and surfaces the edited usage", async () => {
      const { t, tAera, tHarley, projectId, serviceId } = await setupProject();
      const initialDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );

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

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId: firstUsageId,
        resourceId,
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
      expect(projectDetails.bookingStartTime).toBe(
        initialDetails.bookingStartTime,
      );
      expect(projectDetails.bookingEndTime).toBe(initialDetails.bookingEndTime);
      expect(updatedUsage).toMatchObject({
        _id: firstUsageId,
        resource: resourceId,
        startTime: updatedStart,
        endTime: updatedEnd,
        snapshot: {
          costAtTime: 6,
        },
        pricingSnapshot: {
          duration: 3,
          rate: 2,
          timeCost: 6,
          materialCost: 0,
          setupFeePortion: 0,
          subtotal: 6,
          unitName: "hour",
          pricingVariant: "UP",
        },
        resourceDetails: {
          _id: resourceId,
          category: "machine",
          type: "3D printer",
          status: "Available",
        },
      });
      expect(unchangedUsage?.snapshot.costAtTime).toBe(4);
      expect(unchangedUsage?.pricingSnapshot).toEqual({
        duration: 2,
        rate: 2,
        timeCost: 4,
        materialCost: 0,
        setupFeePortion: 0,
        subtotal: 4,
        unitName: "hour",
        pricingVariant: "UP",
      });
    });

    test("Project queries do not infer the main booking window from resource usages", async () => {
      const { t, tHarley, projectId } = await setupProject();
      const usageStartTime =
        getLabDayStart(new Date()).getTime() + 10 * HOUR_MS;

      await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();

        await ctx.db.patch(projectId, {
          bookingStartTime: undefined,
          bookingEndTime: undefined,
        });

        await ctx.db.patch(usage!._id, {
          startTime: usageStartTime,
          endTime: usageStartTime + HOUR_MS,
        });
      });

      const [details, list, todayList] = await Promise.all([
        tHarley.query(api.projects.query.getProject, { projectId }),
        tHarley.query(api.projects.query.getProjects, {
          paginationOpts: { cursor: null, numItems: 10 },
        }),
        tHarley.query(api.projects.query.getProjects, {
          paginationOpts: { cursor: null, numItems: 10 },
          dateFilter: "today",
        }),
      ]);

      expect(details.bookingStartTime).toBeNull();
      expect(details.bookingEndTime).toBeNull();
      expect(list.page[0].bookingStartTime).toBeNull();
      expect(list.page[0].bookingEndTime).toBeNull();
      expect(todayList.page).toHaveLength(0);
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
      expect(
        projectDetails.resourceUsages.find((usage) => usage._id === usageId)
          ?.pricingSnapshot,
      ).toEqual({
        duration: 4,
        rate: 2,
        timeCost: 8,
        materialCost: 0,
        setupFeePortion: 0,
        subtotal: 8,
        unitName: "hour",
        pricingVariant: "UP",
      });
    });

    test("Project list date filters follow current lab day, week, and month windows", async () => {
      const { t, tHarley, tAera } = await setupUsers();

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
        requirements: [],
        fileTypes: [],
        description: "cut parts",
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const todayProject = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "today project",
          pricing: "Default",
          description: "scheduled today",
          fulfillmentMode: "self-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "today",
          booking: {
            startTime: Date.now() + 72 * HOUR_MS,
            endTime: Date.now() + 73 * HOUR_MS,
            date: Date.now() + 72 * HOUR_MS,
          },
        },
      );
      const weekProject = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "week project",
          pricing: "Default",
          description: "scheduled this week",
          fulfillmentMode: "self-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "week",
          booking: {
            startTime: Date.now() + 74 * HOUR_MS,
            endTime: Date.now() + 75 * HOUR_MS,
            date: Date.now() + 74 * HOUR_MS,
          },
        },
      );
      const nextMonthProject = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "next month project",
          pricing: "Default",
          description: "scheduled next month",
          fulfillmentMode: "self-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "month",
          booking: {
            startTime: Date.now() + 76 * HOUR_MS,
            endTime: Date.now() + 77 * HOUR_MS,
            date: Date.now() + 76 * HOUR_MS,
          },
        },
      );

      await flushScheduledFunctions(t);

      const currentDay = getLabDayStart(Date.now());
      const currentWeekStart = startOfLabWeek(currentDay, 1);
      const currentWeekEnd = endOfLabWeek(currentDay, 1);
      const currentMonthStart = startOfLabMonth(currentDay);
      const currentMonthEnd = endOfLabMonth(currentDay);
      const sameWeekDay =
        currentDay.getTime() === currentWeekEnd.getTime()
          ? addLabDays(currentDay, -1)
          : addLabDays(currentDay, 1);
      const nextMonthDay = startOfLabMonth(addLabMonths(currentDay, 1));

      const todayStartTime = currentDay.getTime() + 9 * HOUR_MS;
      const weekStartTime = sameWeekDay.getTime() + 10 * HOUR_MS;
      const nextMonthStartTime = nextMonthDay.getTime() + 11 * HOUR_MS;

      await t.run(async (ctx) => {
        const assignments = [
          [todayProject.projectId, todayStartTime, nextMonthStartTime],
          [weekProject.projectId, weekStartTime, todayStartTime],
          [nextMonthProject.projectId, nextMonthStartTime, todayStartTime],
        ] as const;

        for (const [
          projectId,
          bookingStartTime,
          usageStartTime,
        ] of assignments) {
          const usage = await ctx.db
            .query("resourceUsage")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .first();

          await ctx.db.patch(projectId, {
            bookingStartTime,
            bookingEndTime: bookingStartTime + HOUR_MS,
          });

          await ctx.db.patch(usage!._id, {
            startTime: usageStartTime,
            endTime: usageStartTime + HOUR_MS,
          });
        }
      });

      const todayList = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
        dateFilter: "today",
      });
      const weekList = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
        dateFilter: "week",
      });
      const monthList = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
        dateFilter: "month",
      });

      const expectedWeekNames = (
        [
          ["today project", todayStartTime],
          ["week project", weekStartTime],
          ["next month project", nextMonthStartTime],
        ] as const
      )
        .filter(([, startTime]) => {
          return (
            startTime >= currentWeekStart.getTime() &&
            startTime < addLabDays(currentWeekEnd, 1).getTime()
          );
        })
        .map(([name]) => name)
        .sort();
      const expectedMonthNames = (
        [
          ["today project", todayStartTime],
          ["week project", weekStartTime],
          ["next month project", nextMonthStartTime],
        ] as const
      )
        .filter(([, startTime]) => {
          return (
            startTime >= currentMonthStart.getTime() &&
            startTime < addLabDays(currentMonthEnd, 1).getTime()
          );
        })
        .map(([name]) => name)
        .sort();

      expect(todayList.page.map((project) => project.name)).toEqual([
        "today project",
      ]);
      expect(weekList.page.map((project) => project.name).sort()).toEqual(
        expectedWeekNames,
      );
      expect(monthList.page.map((project) => project.name).sort()).toEqual(
        expectedMonthNames,
      );
    });
  });

  describe("Usage lifecycle mutations", () => {
    test("resource-aware scheduling allows overlaps on different resources but rejects same-resource conflicts", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Printer A",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Primary printer",
        status: "Available",
      });
      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Printer B",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Secondary printer",
        status: "Available",
      });

      const { printerAId, printerBId } = await t.run(async (ctx) => {
        const resources = await ctx.db.query("resources").collect();
        return {
          printerAId: resources.find(
            (resource) => resource.name === "Printer A",
          )!._id,
          printerBId: resources.find(
            (resource) => resource.name === "Printer B",
          )!._id,
        };
      });

      await tAera.mutation(api.services.mutate.addService, {
        name: "multi printer",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [],
          setupFee: 1,
          unitName: "hour",
          timeRate: 2,
        },
        requirements: ["model"],
        fileTypes: [],
        description: "Parallel printers",
        resources: [printerAId, printerBId],
        status: "Available",
      });

      const resolvedServiceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const bookingDay = Date.now() + 72 * HOUR_MS;
      const bookingStart = bookingDay + HOUR_MS;
      const bookingEnd = bookingStart + 2 * HOUR_MS;

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "parallel prints",
          pricing: "Default",
          description: "first booking",
          fulfillmentMode: "self-service",
          material: "provide-own",
          files: [],
          service: resolvedServiceId,
          notes: "first machine",
          booking: {
            startTime: bookingStart,
            endTime: bookingEnd,
            date: bookingDay,
          },
        },
      );

      const firstUsageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId: firstUsageId,
        resourceId: printerAId,
      });

      const overlappingStart = bookingStart + 30 * 60 * 1000;
      const overlappingEnd = overlappingStart + 90 * 60 * 1000;

      const { usageId: secondUsageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime: overlappingStart,
          endTime: overlappingEnd,
          resourceId: printerBId,
        },
      );

      await expect(
        tAera.mutation(api.projects.mutate.createUsage, {
          projectId,
          startTime: overlappingStart,
          endTime: overlappingEnd,
          resourceId: printerAId,
        }),
      ).rejects.toThrow("This timeslot is already booked.");

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(details.resourceUsages).toHaveLength(2);
      expect(
        details.resourceUsages.find((usage) => usage._id === secondUsageId),
      ).toMatchObject({
        resource: printerBId,
        startTime: overlappingStart,
        endTime: overlappingEnd,
      });
    });

    test("createUsage appends a usage with independent pricing and preserves the project schedule", async () => {
      const { tAera, tHarley, projectId } = await setupProject();
      const initialDetails = await tHarley.query(
        api.projects.query.getProject,
        {
          projectId,
        },
      );
      const startTime = Date.now() + 80 * HOUR_MS;
      const endTime = startTime + 2 * HOUR_MS;

      const { usageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime,
          endTime,
        },
      );

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      const list = await tHarley.query(api.projects.query.getProjects, {
        paginationOpts: { cursor: null, numItems: 10 },
      });
      const createdUsage = details.resourceUsages.find(
        (usage) => usage._id === usageId,
      );

      expect(details.totalInvoice).toEqual({
        subtotal: 6,
        tax: 0,
        total: 6,
      });
      expect(details.bookingStartTime).toBe(initialDetails.bookingStartTime);
      expect(details.bookingEndTime).toBe(initialDetails.bookingEndTime);
      expect(details.resourceUsages.map((usage) => usage.startTime)).toEqual(
        [...details.resourceUsages.map((usage) => usage.startTime)].sort(
          (left, right) => left - right,
        ),
      );
      expect(createdUsage).toMatchObject({
        _id: usageId,
        startTime,
        endTime,
        snapshot: {
          costAtTime: 4,
          unit: "hour",
        },
        pricingSnapshot: {
          duration: 2,
          rate: 2,
          timeCost: 4,
          materialCost: 0,
          setupFeePortion: 0,
          subtotal: 4,
          unitName: "hour",
          pricingVariant: "UP",
        },
      });
      expect(list.page[0].usageCount).toBe(2);
    });

    test("updateUsage targets only the selected usage resource", async () => {
      const { t, tAera, tHarley, projectId } = await setupProject();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Prusa MK4",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Secondary printer",
        status: "Available",
      });

      const { usageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime: Date.now() + 96 * HOUR_MS,
          endTime: Date.now() + 98 * HOUR_MS,
        },
      );

      const resourceId = await t.run(async (ctx) => {
        const resource = await ctx.db.query("resources").first();
        return resource!._id;
      });

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId,
        resourceId,
      });

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      const originalUsage = details.resourceUsages.find(
        (usage) => usage._id !== usageId,
      );
      const updatedUsage = details.resourceUsages.find(
        (usage) => usage._id === usageId,
      );

      expect(originalUsage?.resource ?? null).toBeNull();
      expect(updatedUsage).toMatchObject({
        _id: usageId,
        resource: resourceId,
        resourceDetails: {
          _id: resourceId,
          type: "3D printer",
          status: "Available",
          description: "Secondary printer",
        },
      });
    });

    test("resource usage updates reject moving onto an occupied resource timeline", async () => {
      const { t, tAera, tHarley } = await setupUsers();

      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Printer A",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Primary printer",
        status: "Available",
      });
      await tAera.mutation(api.resource.mutate.addResource, {
        name: "Printer B",
        category: "machine",
        type: "3D printer",
        images: [],
        description: "Secondary printer",
        status: "Available",
      });

      const { printerAId, printerBId } = await t.run(async (ctx) => {
        const resources = await ctx.db.query("resources").collect();
        return {
          printerAId: resources.find(
            (resource) => resource.name === "Printer A",
          )!._id,
          printerBId: resources.find(
            (resource) => resource.name === "Printer B",
          )!._id,
        };
      });

      await tAera.mutation(api.services.mutate.addService, {
        name: "reschedulable printers",
        images: [],
        samples: [],
        serviceCategory: {
          type: "FABRICATION",
          materials: [],
          setupFee: 1,
          unitName: "hour",
          timeRate: 2,
        },
        requirements: ["model"],
        fileTypes: [],
        description: "Parallel printers",
        resources: [printerAId, printerBId],
        status: "Available",
      });

      const serviceId = await t.run(async (ctx) => {
        const service = await ctx.db.query("services").first();
        return service!._id;
      });

      const bookingDay = Date.now() + 96 * HOUR_MS;
      const firstStart = bookingDay + HOUR_MS;
      const firstEnd = firstStart + 2 * HOUR_MS;

      const { projectId } = await tHarley.mutation(
        api.projects.mutate.createProject,
        {
          name: "reschedule conflict",
          pricing: "Default",
          description: "base booking",
          fulfillmentMode: "self-service",
          material: "provide-own",
          files: [],
          service: serviceId,
          notes: "reschedule",
          booking: {
            startTime: firstStart,
            endTime: firstEnd,
            date: bookingDay,
          },
        },
      );

      const firstUsageId = await t.run(async (ctx) => {
        const usage = await ctx.db
          .query("resourceUsage")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .first();
        return usage!._id;
      });

      await tAera.mutation(api.projects.mutate.updateUsage, {
        projectId,
        usageId: firstUsageId,
        resourceId: printerAId,
      });

      const { usageId: secondUsageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime: firstEnd + HOUR_MS,
          endTime: firstEnd + 2 * HOUR_MS,
          resourceId: printerBId,
        },
      );

      await expect(
        tAera.mutation(api.projects.mutate.updateUsage, {
          projectId,
          usageId: secondUsageId,
          resourceId: printerAId,
          startTime: firstStart + 15 * 60 * 1000,
          endTime: firstStart + 75 * 60 * 1000,
        }),
      ).rejects.toThrow("This timeslot is already booked.");
    });

    test("updateUsagePricing only changes the targeted usage and refreshes project totals", async () => {
      const { tAera, tHarley, projectId } = await setupProject();

      const { usageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime: Date.now() + 104 * HOUR_MS,
          endTime: Date.now() + 106 * HOUR_MS,
        },
      );

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 2,
        rate: 5,
        timeCost: 10,
        materialCost: 0,
        setupFeePortion: 0,
        unitName: "hour",
      });

      const details = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      const unchangedUsage = details.resourceUsages.find(
        (usage) => usage._id !== usageId,
      );
      const updatedUsage = details.resourceUsages.find(
        (usage) => usage._id === usageId,
      );

      expect(details.totalInvoice).toEqual({
        subtotal: 12,
        tax: 0,
        total: 12,
      });
      expect(details.pricingSnapshot).toEqual({
        setupFee: 0,
        timeCost: 12,
        materialCost: 0,
        total: 12,
        duration: 3,
        rate: 4,
        unitName: "hour",
      });
      expect(unchangedUsage?.snapshot.costAtTime).toBe(2);
      expect(updatedUsage).toMatchObject({
        _id: usageId,
        snapshot: {
          costAtTime: 10,
        },
        pricingSnapshot: {
          duration: 2,
          rate: 5,
          timeCost: 10,
          materialCost: 0,
          setupFeePortion: 0,
          subtotal: 10,
          unitName: "hour",
          pricingVariant: "UP",
        },
      });
    });

    test("updateProjectSchedule changes the project headline schedule without modifying usage windows", async () => {
      const { tHarley, tAera, projectId } = await setupProject();
      const before = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });
      const nextStart = Date.now() + 144 * HOUR_MS;
      const nextEnd = nextStart + 5 * HOUR_MS;

      await tAera.mutation(api.projects.mutate.updateProjectSchedule, {
        projectId,
        startTime: nextStart,
        endTime: nextEnd,
      });

      const after = await tHarley.query(api.projects.query.getProject, {
        projectId,
      });

      expect(after.bookingStartTime).toBe(nextStart);
      expect(after.bookingEndTime).toBe(nextEnd);
      expect(after.resourceUsages).toEqual(before.resourceUsages);
    });
  });

  describe("Project completion and cleanup", () => {
    test("Marking a project completed preserves usage pricing, materials, and stock", async () => {
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
        materialIds: [materialId],
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

      const usageId = await getProjectUsageId(t, projectId);

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId,
        duration: 3,
        rate: 2,
        timeCost: 6,
        materialCost: 8,
        setupFeePortion: 1,
        unitName: "hour",
        materialsUsed: [{ materialId, amountUsed: 4 }],
      });
      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
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
        expect(usage!.pricingSnapshot).toEqual({
          duration: 3,
          rate: 2,
          timeCost: 6,
          materialCost: 8,
          setupFeePortion: 1,
          subtotal: 15,
          unitName: "hour",
          pricingVariant: "Default",
        });
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

    test("Marking a multi-usage project completed preserves allocated usage pricing without double counting", async () => {
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

      const firstUsageId = await getProjectUsageId(t, projectId);
      const { usageId: secondUsageId } = await tAera.mutation(
        api.projects.mutate.createUsage,
        {
          projectId,
          startTime: Date.now() + 48 * HOUR_MS,
          endTime: Date.now() + 52 * HOUR_MS,
        },
      );

      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId: firstUsageId,
        duration: 2,
        rate: 2,
        timeCost: 4,
        materialCost: 0,
        setupFeePortion: 1,
        unitName: "hour",
      });
      await tAera.mutation(api.projects.mutate.updateUsagePricing, {
        projectId,
        usageId: secondUsageId,
        duration: 4,
        rate: 2,
        timeCost: 8,
        materialCost: 0,
        setupFeePortion: 0,
        unitName: "hour",
      });
      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await tAera.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
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
        const sortedPricing = usages
          .map((usage) => usage.pricingSnapshot)
          .sort((a, b) => (a?.subtotal ?? 0) - (b?.subtotal ?? 0));

        expect(project!.totalInvoice).toEqual({
          subtotal: 13,
          tax: 0,
          total: 13,
        });
        expect(sortedCosts).toEqual([5, 8]);
        expect(sortedPricing).toEqual([
          {
            duration: 2,
            rate: 2,
            timeCost: 4,
            materialCost: 0,
            setupFeePortion: 1,
            subtotal: 5,
            unitName: "hour",
            pricingVariant: "Default",
          },
          {
            duration: 4,
            rate: 2,
            timeCost: 8,
            materialCost: 0,
            setupFeePortion: 0,
            subtotal: 8,
            unitName: "hour",
            pricingVariant: "Default",
          },
        ]);
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

      await tAera.mutation(api.projects.mutate.deleteUsage, {
        projectId,
        usageId,
      });

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
