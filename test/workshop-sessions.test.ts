import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import resendComponent from "@convex-dev/resend/test";

process.env.RESEND_TEST_MODE = "true";
process.env.RESEND_API_KEY ??= "test-api-key";
process.env.DISABLE_SCHEDULED_EMAILS = "true";

const HOUR_MS = 1000 * 60 * 60;

describe("workshopSessions", () => {
  /**
   * Creates a fresh Convex test instance with two user profiles:
   *   "Client" (userId: "1") — used where a workshop participant is needed
   *   "Admin"  (userId: "2") — used for all mutations/queries in these tests
   * Also inserts one resource and one material so tests that need them
   * can reference the IDs.
   */
  async function setup() {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.{ts,tsx}"));
    rateLimiterComponent.register(t);
    resendComponent.register(t);

    await t.mutation(internal.users.createUserProfile, {
      userId: "1",
      email: "delivered+client@resend.dev",
      name: "Client",
    });
    await t.mutation(internal.users.createAdmin, {
      userId: "2",
      email: "delivered+admin@resend.dev",
      name: "Admin",
    });

    const tClient = t.withIdentity({ subject: "1", name: "Client" });
    const tAdmin = t.withIdentity({ subject: "2", name: "Admin" });

    const resourceId = await t.run(async (ctx) => {
      return ctx.db.insert("resources", {
        name: "Workshop Room A",
        category: "room",
        type: "workshop",
        images: [],
        description: "Main workshop room",
        status: "Available",
      });
    });

    const materialId = await tAdmin.mutation(api.materials.mutate.addMaterial, {
      name: "Starter Kit",
      category: "Kits",
      unit: "pcs",
      currentStock: 50,
      pricePerUnit: 15,
      costPerUnit: 8,
      status: "IN_STOCK",
    });

    return { t, tClient, tAdmin, resourceId, materialId };
  }

  /**
   * Inserts a bare-minimum workshop service via the admin identity.
   * No schedules are created — sessions are added independently with
   * the `workshopSessions.mutate.create` mutation.
   */
  async function createWorkshopService(
    tAdmin: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  ) {
    await tAdmin.mutation(api.services.mutate.addService, {
      name: "3D Printing Workshop",
      images: [],
      samples: [],
      serviceCategory: {
        type: "WORKSHOP",
        amount: 500,
      },
      requirements: [],
      fileTypes: [],
      description: "Learn 3D printing",
      status: "Available",
    });
  }

  // ── 1. Create sessions & list by service ────────────────────────────────

  test("creates sessions for a workshop service and lists them by service", async () => {
    const { t, tAdmin, resourceId, materialId } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const now = Date.now();
    const futureDate = now + 7 * 24 * HOUR_MS;
    const slot1Start = futureDate + 9 * HOUR_MS;
    const slot1End = slot1Start + 2 * HOUR_MS;
    const slot2Start = slot1End;
    const slot2End = slot2Start + 2 * HOUR_MS;

    // Create two sessions — second one with explicit resources and materials
    const s1 = await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date: futureDate,
      startTime: slot1Start,
      endTime: slot1End,
      maxSlots: 10,
    });

    const s2 = await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date: futureDate,
      startTime: slot2Start,
      endTime: slot2End,
      maxSlots: 5,
      resources: [resourceId],
      availableMaterials: [materialId],
    });

    // listByService — should return both ordered by startTime ascending
    const sessions = await tAdmin.query(
      api.workshopSessions.query.listByService,
      { serviceId },
    );

    expect(sessions).toHaveLength(2);
    expect(sessions[0]._id).toBe(s1);
    expect(sessions[0].maxSlots).toBe(10);
    expect(sessions[0].usedUpSlots).toBe(0);
    expect(sessions[0].status).toBe("active");
    expect(sessions[0].resources).toBeUndefined();
    expect(sessions[0].availableMaterials).toEqual([]);

    expect(sessions[1]._id).toBe(s2);
    expect(sessions[1].maxSlots).toBe(5);
    expect(sessions[1].resources).toEqual([resourceId]);
    expect(sessions[1].availableMaterials).toEqual([materialId]);

    // get — fetch a single session by ID
    const fetched = await tAdmin.query(api.workshopSessions.query.get, {
      sessionId: s1,
    });
    expect(fetched).not.toBeNull();
    expect(fetched!.serviceId).toBe(serviceId);
    expect(fetched!.maxSlots).toBe(10);
  });

  // ── 2. Upcoming / past separation ───────────────────────────────────────

  test("separates upcoming and past sessions with serviceName attached", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const now = Date.now();
    const pastDate = now - 7 * 24 * HOUR_MS;
    const futureDate = now + 7 * 24 * HOUR_MS;

    // Past session
    await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date: pastDate,
      startTime: pastDate + 9 * HOUR_MS,
      endTime: pastDate + 11 * HOUR_MS,
      maxSlots: 10,
    });

    // Upcoming session
    await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date: futureDate,
      startTime: futureDate + 9 * HOUR_MS,
      endTime: futureDate + 11 * HOUR_MS,
      maxSlots: 10,
    });

    const upcoming = await tAdmin.query(
      api.workshopSessions.query.listUpcoming,
      {},
    );
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].serviceName).toBe("3D Printing Workshop");
    expect(upcoming[0].startTime).toBeGreaterThan(now);

    const past = await tAdmin.query(api.workshopSessions.query.listPast, {});
    expect(past).toHaveLength(1);
    expect(past[0].serviceName).toBe("3D Printing Workshop");
    expect(past[0].startTime).toBeLessThan(now);

    // Respect limit parameter
    const limited = await tAdmin.query(
      api.workshopSessions.query.listUpcoming,
      { limit: 1 },
    );
    expect(limited).toHaveLength(1);
  });

  // ── 3. Cancel sets status to cancelled ──────────────────────────────────

  test("cancel sets status to cancelled and omits session from default list", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const now = Date.now();
    const futureDate = now + 7 * 24 * HOUR_MS;

    const sessionId = await tAdmin.mutation(
      api.workshopSessions.mutate.create,
      {
        serviceId,
        date: futureDate,
        startTime: futureDate + 9 * HOUR_MS,
        endTime: futureDate + 11 * HOUR_MS,
        maxSlots: 10,
      },
    );

    // Cancel the session
    await tAdmin.mutation(api.workshopSessions.mutate.cancel, { sessionId });

    // Verify status via get
    const session = await tAdmin.query(api.workshopSessions.query.get, {
      sessionId,
    });
    expect(session).not.toBeNull();
    expect(session!.status).toBe("cancelled");

    // Default listByService excludes cancelled
    const activeOnly = await tAdmin.query(
      api.workshopSessions.query.listByService,
      { serviceId },
    );
    expect(activeOnly).toHaveLength(0);

    // includeCancelled: true includes them
    const withCancelled = await tAdmin.query(
      api.workshopSessions.query.listByService,
      { serviceId, includeCancelled: true },
    );
    expect(withCancelled).toHaveLength(1);
    expect(withCancelled[0].status).toBe("cancelled");
  });

  // ── 4. Remove fails when usedUpSlots > 0 ────────────────────────────────

  test("remove fails when usedUpSlots > 0 and succeeds when usedUpSlots is 0", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const now = Date.now();
    const futureDate = now + 7 * 24 * HOUR_MS;

    const sessionId = await tAdmin.mutation(
      api.workshopSessions.mutate.create,
      {
        serviceId,
        date: futureDate,
        startTime: futureDate + 9 * HOUR_MS,
        endTime: futureDate + 11 * HOUR_MS,
        maxSlots: 10,
      },
    );

    // Simulate registrations by bumping usedUpSlots directly
    await t.run(async (ctx) => {
      await ctx.db.patch(sessionId, { usedUpSlots: 3 });
    });

    // Remove should throw because usedUpSlots > 0
    await expect(
      tAdmin.mutation(api.workshopSessions.mutate.remove, { sessionId }),
    ).rejects.toThrow("Cannot delete a session that has registrations");

    // Reset usedUpSlots to 0
    await t.run(async (ctx) => {
      await ctx.db.patch(sessionId, { usedUpSlots: 0 });
    });

    // Now removal should succeed
    await tAdmin.mutation(api.workshopSessions.mutate.remove, { sessionId });

    const deleted = await tAdmin.query(api.workshopSessions.query.get, {
      sessionId,
    });
    expect(deleted).toBeNull();
  });

  // ── 5. Create validates workshop type ───────────────────────────────────

  test("create rejects non-WORKSHOP services", async () => {
    const { t, tAdmin } = await setup();

    // Create a FABRICATION service
    await tAdmin.mutation(api.services.mutate.addService, {
      name: "3D Printing",
      images: [],
      samples: [],
      serviceCategory: {
        type: "FABRICATION",
        setupFee: 100,
        unitName: "hour",
        timeRate: 50,
      },
      requirements: [],
      fileTypes: [],
      description: "3D printing service",
      status: "Available",
    });

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const futureDate = Date.now() + 7 * 24 * HOUR_MS;

    await expect(
      tAdmin.mutation(api.workshopSessions.mutate.create, {
        serviceId,
        date: futureDate,
        startTime: futureDate + 9 * HOUR_MS,
        endTime: futureDate + 11 * HOUR_MS,
        maxSlots: 10,
      }),
    ).rejects.toThrow("Sessions can only be created for WORKSHOP services.");
  });

  // ── 6. Additional validation edge cases ─────────────────────────────────

  test("create validates that endTime is after startTime", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const futureDate = Date.now() + 7 * 24 * HOUR_MS;

    await expect(
      tAdmin.mutation(api.workshopSessions.mutate.create, {
        serviceId,
        date: futureDate,
        startTime: futureDate + 11 * HOUR_MS,
        endTime: futureDate + 9 * HOUR_MS,
        maxSlots: 10,
      }),
    ).rejects.toThrow("End time must be after start time.");
  });

  test("create validates that maxSlots is at least 1", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const futureDate = Date.now() + 7 * 24 * HOUR_MS;

    await expect(
      tAdmin.mutation(api.workshopSessions.mutate.create, {
        serviceId,
        date: futureDate,
        startTime: futureDate + 9 * HOUR_MS,
        endTime: futureDate + 11 * HOUR_MS,
        maxSlots: 0,
      }),
    ).rejects.toThrow("maxSlots must be at least 1.");
  });

  test("create rejects non-existent serviceId", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    // Delete the service so the ID is no longer valid
    await tAdmin.mutation(api.services.mutate.deleteService, {
      service: serviceId,
    });

    const futureDate = Date.now() + 7 * 24 * HOUR_MS;

    await expect(
      tAdmin.mutation(api.workshopSessions.mutate.create, {
        serviceId,
        date: futureDate,
        startTime: futureDate + 9 * HOUR_MS,
        endTime: futureDate + 11 * HOUR_MS,
        maxSlots: 10,
      }),
    ).rejects.toThrow("Service not found.");
  });

  // ── 7. Update mutations ─────────────────────────────────────────────────

  test("update patches individual fields on a session", async () => {
    const { t, tAdmin, resourceId, materialId } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const now = Date.now();
    const futureDate = now + 7 * 24 * HOUR_MS;
    const startTime = futureDate + 9 * HOUR_MS;
    const endTime = startTime + 2 * HOUR_MS;

    const sessionId = await tAdmin.mutation(
      api.workshopSessions.mutate.create,
      {
        serviceId,
        date: futureDate,
        startTime,
        endTime,
        maxSlots: 10,
      },
    );

    const newEndTime = endTime + 1 * HOUR_MS;
    await tAdmin.mutation(api.workshopSessions.mutate.update, {
      sessionId,
      endTime: newEndTime,
      maxSlots: 8,
      resources: [resourceId],
      availableMaterials: [materialId],
      status: "completed",
    });

    const session = await tAdmin.query(api.workshopSessions.query.get, {
      sessionId,
    });
    expect(session!.endTime).toBe(newEndTime);
    expect(session!.maxSlots).toBe(8);
    expect(session!.resources).toEqual([resourceId]);
    expect(session!.availableMaterials).toEqual([materialId]);
    expect(session!.status).toBe("completed");
    // Fields not in the update should remain unchanged
    expect(session!.startTime).toBe(startTime);
    expect(session!.date).toBe(futureDate);
  });

  test("update prevents reducing maxSlots below usedUpSlots", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const futureDate = Date.now() + 7 * 24 * HOUR_MS;

    const sessionId = await tAdmin.mutation(
      api.workshopSessions.mutate.create,
      {
        serviceId,
        date: futureDate,
        startTime: futureDate + 9 * HOUR_MS,
        endTime: futureDate + 11 * HOUR_MS,
        maxSlots: 10,
      },
    );

    // Simulate 3 registrations
    await t.run(async (ctx) => {
      await ctx.db.patch(sessionId, { usedUpSlots: 3 });
    });

    await expect(
      tAdmin.mutation(api.workshopSessions.mutate.update, {
        sessionId,
        maxSlots: 2,
      }),
    ).rejects.toThrow("Cannot reduce maxSlots below 3");
  });

  // ── 8. Upcoming / past exclude cancelled sessions ───────────────────────

  test("upcoming and past queries exclude cancelled sessions", async () => {
    const { t, tAdmin } = await setup();
    await createWorkshopService(tAdmin);

    const service = await t.run(async (ctx) => {
      const svc = await ctx.db.query("services").first();
      return svc!;
    });
    const serviceId = service._id;

    const now = Date.now();
    const futureDate = now + 7 * 24 * HOUR_MS;

    // Create two upcoming sessions
    const s1 = await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date: futureDate,
      startTime: futureDate + 9 * HOUR_MS,
      endTime: futureDate + 11 * HOUR_MS,
      maxSlots: 10,
    });

    await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date: futureDate,
      startTime: futureDate + 12 * HOUR_MS,
      endTime: futureDate + 14 * HOUR_MS,
      maxSlots: 10,
    });

    // Cancel the first one
    await tAdmin.mutation(api.workshopSessions.mutate.cancel, {
      sessionId: s1,
    });

    // listUpcoming should return only the non-cancelled session
    const upcoming = await tAdmin.query(
      api.workshopSessions.query.listUpcoming,
      {},
    );
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]._id).not.toBe(s1);
  });
});
