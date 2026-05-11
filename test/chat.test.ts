import { describe, expect, test } from "vitest";
import { api, internal } from "../convex/_generated/api";
import { setupUsers } from "./helper";

describe("Room membership authorization", () => {
  test("only admins can add and remove people in a room", async () => {
    const { t, tAera: tAdmin, tHarley: tClient } = await setupUsers();

    // Create a Maker
    await tAdmin.mutation(internal.users.createMaker, {
      userId: "3",
      email: "maker@example.com",
      name: "Maker",
    });
    const tMaker = t.withIdentity({ subject: "3", name: "Maker" });

    // Get profile IDs directly from DB to avoid BetterAuth component calls in getUserProfile
    const adminProfile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "2"))
        .unique(),
    );
    const makerProfile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "3"))
        .unique(),
    );
    const clientProfile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "1"))
        .unique(),
    );

    // 1. Create a service and a project to get a room
    await tAdmin.mutation(api.services.mutate.addService, {
      name: "Chat Test Service",
      images: [],
      samples: [],
      serviceCategory: {
        type: "FABRICATION",
        setupFee: 10,
        unitName: "hour",
        timeRate: 5,
      },
      requirements: [],
      fileTypes: [],
      description: "Test",
      status: "Available",
    });

    const serviceId = await t.run(async (ctx) => {
      const service = await ctx.db
        .query("services")
        .filter((q) => q.eq(q.field("slug"), "chat-test-service"))
        .unique();
      return service!._id;
    });

    const bookingDay = Date.UTC(2026, 6, 1);
    const { roomId } = await tClient.mutation(
      api.projects.mutate.createProject,
      {
        name: "Chat Test Project",
        pricing: "Default",
        description: "Test",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: serviceId,
        notes: "Test",
        booking: {
          startTime: bookingDay + 10 * 3600000,
          endTime: bookingDay + 11 * 3600000,
          date: bookingDay,
        },
      },
    );

    // 2. Test Admin can add Maker
    await tAdmin.mutation(api.chat.mutate.addNewMember, {
      roomId,
      userId: makerProfile!._id,
    });

    // Verify Maker is in room
    const isMakerInRoom = await t.run(async (ctx) => {
      const member = await ctx.db
        .query("roomMembers")
        .withIndex("by_roomId_participantId", (q) =>
          q.eq("roomId", roomId).eq("participantId", makerProfile!._id),
        )
        .first();
      return !!member;
    });
    expect(isMakerInRoom).toBe(true);

    // 3. Test Admin can remove Maker
    await tAdmin.mutation(api.chat.mutate.removeMember, {
      roomId,
      userId: makerProfile!._id,
    });

    // Verify Maker is NOT in room
    const isMakerInRoomAfter = await t.run(async (ctx) => {
      const member = await ctx.db
        .query("roomMembers")
        .withIndex("by_roomId_participantId", (q) =>
          q.eq("roomId", roomId).eq("participantId", makerProfile!._id),
        )
        .first();
      return !!member;
    });
    expect(isMakerInRoomAfter).toBe(false);

    // 4. Test Client CANNOT add members
    await expect(
      tClient.mutation(api.chat.mutate.addNewMember, {
        roomId,
        userId: clientProfile!._id,
      }),
    ).rejects.toThrow(
      "Unauthorized: You do not have the correct permissions to mutate.",
    );

    // 5. Test Maker status (Currently the code allows Makers, let's confirm this)
    // If the requirement is ONLY admins, we might need to change the code later.
    // For now, let's see what happens. I'll expect failure for maker to confirm if I need to change code.
    await expect(
      tMaker.mutation(api.chat.mutate.addNewMember, {
        roomId,
        userId: makerProfile!._id,
      }),
    ).rejects.toThrow(
      "Unauthorized: You do not have the correct permissions to mutate.",
    );
  });
});
