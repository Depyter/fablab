import { describe, expect, test } from "vitest";
import { setupProject, setupUsers } from "./helper";
import { api, internal } from "../convex/_generated/api";

describe("Project and Chat functionality", () => {
  test("Initialization", async () => {
    const { t } = await setupProject();

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

  test("Chat messaging", async () => {
    const { t, tAera, tHarley, roomId } = await setupProject();

    await tAera.mutation(api.chat.mutate.sendMessage, {
      content: "Hello this project...",
      room: roomId,
    });

    await tHarley.mutation(api.chat.mutate.sendMessage, {
      content: "Hello Aera",
      room: roomId,
    });

    // Check if the message is sent
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
          q.eq("room", roomId).eq("threadId", undefined),
        )
        .collect();

      expect(messages.length).toBe(2);
      // system message is in a thread, so these are the first root messages
      expect(messages[0].sender).toBe(userAera!._id);
      expect(messages[1].sender).toBe(userHarley!._id);

      expect(messages[0].content).toBe("Hello this project...");
      expect(messages[1].content).toBe("Hello Aera");
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

    await t.run(async (ctx) => {
      const project = await ctx.db.get(projectId);
      expect(project!.status).toBe("approved");
      expect(project!.assignedMaker).toBe(makerId);
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

    const projectId = await t.run(async (ctx) => {
      const project = await ctx.db.query("projects").first();
      return project!._id;
    });

    await tAera.mutation(api.projects.mutate.updateCostBreakdown, {
      projectId,
      setupFee: 1,
      timeCost: 2,
      materialCost: 20,
      materialsUsed: [{ materialId, amountUsed: 10 }],
    });

    await t.run(async (ctx) => {
      const material = await ctx.db.get(materialId);
      const usage = await ctx.db.query("resourceUsage").first();

      expect(material!.currentStock).toBe(90);
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
      timeCost: 2,
      materialCost: 6,
      materialsUsed: [{ materialId, amountUsed: 3 }],
    });

    await t.run(async (ctx) => {
      const material = await ctx.db.get(materialId);
      const usage = await ctx.db.query("resourceUsage").first();

      expect(material!.currentStock).toBe(97);
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
  test("Update Project (Non-privileged)", async () => {});
});
