import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import resendComponent from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { flushScheduledFunctions } from "./helper";

process.env.RESEND_TEST_MODE = "true";
process.env.RESEND_API_KEY ??= "test-api-key";
process.env.DISABLE_SCHEDULED_EMAILS = "true";

const HOUR_MS = 1000 * 60 * 60;

describe("getWorkshopEvents — resource & material resolution", () => {
  function expectPresent<T>(value: T | null | undefined, message: string): T {
    expect(value).toBeDefined();
    if (value == null) {
      throw new Error(message);
    }
    return value;
  }

  async function getFirstServiceId(t: ReturnType<typeof convexTest>) {
    const service = await t.run(async (ctx) =>
      ctx.db.query("services").first(),
    );
    expect(service).not.toBeNull();
    if (!service) {
      throw new Error("Expected a service to exist for this test.");
    }
    return service._id;
  }

  /**
   * Verifies that getWorkshopEvents resolves resource and material IDs from
   * the service schedule into named objects, rather than passing through
   * raw IDs. This guards against the schedule-iteration optimization that
   * collects IDs and fetches them separately before mapping.
   */
  test("resolves resource and material IDs into named objects", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.{ts,tsx}"));
    rateLimiterComponent.register(t);
    resendComponent.register(t);

    // ── Setup users ─────────────────────────────────────────────────────
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

    // ── Create resources and materials ──────────────────────────────────
    const resourceId = await t.run(async (ctx) => {
      return ctx.db.insert("resources", {
        name: "3D Printer",
        category: "machine",
        type: "fdm",
        images: [],
        description: "A 3D printer for workshop use",
        status: "Available",
      });
    });

    const materialId = await tAdmin.mutation(api.materials.mutate.addMaterial, {
      name: "PLA Filament",
      category: "Filament",
      unit: "grams",
      currentStock: 1000,
      pricePerUnit: 0.1,
      costPerUnit: 0.05,
      status: "IN_STOCK",
    });

    // ── Create workshop service with schedule referencing them ──────────
    const date = Date.now() + 48 * HOUR_MS;
    const startTime = date + HOUR_MS;
    const endTime = startTime + 2 * HOUR_MS;

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

    const serviceId = await getFirstServiceId(t);

    // Create a workshop session so getWorkshopEvents finds this slot
    await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date,
      startTime,
      endTime,
      maxSlots: 10,
      resources: [resourceId],
      availableMaterials: [materialId],
    });

    // ── Create a project for the slot ────────────────────────────────────
    await tClient.mutation(api.projects.mutate.createProject, {
      name: "My Workshop",
      pricing: "Default",
      description: "a workshop",
      fulfillmentMode: "full-service",
      material: "provide-own",
      files: [],
      service: serviceId,
      notes: "",
      booking: { startTime, endTime, date },
    });

    await flushScheduledFunctions(t);

    // ── Query workshop events ────────────────────────────────────────────
    const result = await tAdmin.query(api.projects.query.getWorkshopEvents, {
      status: "all",
    });

    // ── Assertions ───────────────────────────────────────────────────────
    const allEvents = [...result.upcoming, ...result.past];
    expect(allEvents.length).toBeGreaterThan(0);

    const workshopEvent = allEvents.find(
      (e) => e.serviceId === serviceId && e.startTime === startTime,
    );
    const resolvedWorkshopEvent = expectPresent(
      workshopEvent,
      "Expected workshop event to exist.",
    );

    // Verify resources are resolved objects, not raw IDs
    expect(resolvedWorkshopEvent.resources).toBeDefined();
    expect(resolvedWorkshopEvent.resources?.length).toBe(1);
    expect(resolvedWorkshopEvent.resources?.[0]).toEqual({
      _id: resourceId,
      name: "3D Printer",
    });

    // Verify materials are resolved objects, not raw IDs
    expect(resolvedWorkshopEvent.availableMaterials).toBeDefined();
    expect(resolvedWorkshopEvent.availableMaterials?.length).toBe(1);
    expect(resolvedWorkshopEvent.availableMaterials?.[0]).toEqual({
      _id: materialId,
      name: "PLA Filament",
      unit: "grams",
    });
  });

  /**
   * Verifies that a slot with no resources/materials returns undefined
   * (not empty arrays with missing resolved entries).
   */
  test("handles slots with no resources or materials", async () => {
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

    const date = Date.now() + 48 * HOUR_MS;
    const startTime = date + HOUR_MS;
    const endTime = startTime + 2 * HOUR_MS;

    await tAdmin.mutation(api.services.mutate.addService, {
      name: "Basic Workshop",
      images: [],
      samples: [],
      serviceCategory: {
        type: "WORKSHOP",
        amount: 300,
      },
      requirements: [],
      fileTypes: [],
      description: "A simple workshop",
      status: "Available",
    });

    const serviceId = await getFirstServiceId(t);

    // Create a workshop session so getWorkshopEvents finds this slot
    await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date,
      startTime,
      endTime,
      maxSlots: 10,
    });

    await tClient.mutation(api.projects.mutate.createProject, {
      name: "Simple Booking",
      pricing: "Default",
      description: "a basic workshop",
      fulfillmentMode: "full-service",
      material: "provide-own",
      files: [],
      service: serviceId,
      notes: "",
      booking: { startTime, endTime, date },
    });

    await flushScheduledFunctions(t);

    const result = await tAdmin.query(api.projects.query.getWorkshopEvents, {
      status: "all",
    });

    const allEvents = [...result.upcoming, ...result.past];
    const event = allEvents.find(
      (e) => e.serviceId === serviceId && e.startTime === startTime,
    );
    const resolvedEvent = expectPresent(
      event,
      "Expected workshop event without resources/materials.",
    );
    expect(resolvedEvent.resources).toBeUndefined();
    expect(resolvedEvent.availableMaterials).toBeUndefined();
  });

  /**
   * Verifies that a resource deleted after the service was created does not
   * produce a broken entry — it should be silently omitted rather than
   * appearing as an undefined/null entry.
   */
  test("omits deleted resources", async () => {
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

    // Create two resources — one will be deleted to simulate stale data
    const keptResourceId = await t.run(async (ctx) => {
      return ctx.db.insert("resources", {
        name: "Kept Machine",
        category: "machine",
        type: "cnc",
        images: [],
        description: "Stays in the DB",
        status: "Available",
      });
    });

    const deletedResourceId = await t.run(async (ctx) => {
      return ctx.db.insert("resources", {
        name: "Deleted Machine",
        category: "machine",
        type: "laser",
        images: [],
        description: "Will be removed",
        status: "Available",
      });
    });

    const date = Date.now() + 48 * HOUR_MS;
    const startTime = date + HOUR_MS;
    const endTime = startTime + 2 * HOUR_MS;

    await tAdmin.mutation(api.services.mutate.addService, {
      name: "Workshop With Deleted Resource",
      images: [],
      samples: [],
      serviceCategory: {
        type: "WORKSHOP",
        amount: 400,
      },
      requirements: [],
      fileTypes: [],
      description: "One resource is about to be deleted",
      status: "Available",
    });

    const serviceId = await getFirstServiceId(t);

    // Create a workshop session so getWorkshopEvents finds this slot
    await tAdmin.mutation(api.workshopSessions.mutate.create, {
      serviceId,
      date,
      startTime,
      endTime,
      maxSlots: 10,
      resources: [keptResourceId, deletedResourceId],
    });

    // Delete one resource directly to simulate a stale reference
    await t.run(async (ctx) => {
      await ctx.db.delete(deletedResourceId);
    });

    await tClient.mutation(api.projects.mutate.createProject, {
      name: "Test Project",
      pricing: "Default",
      description: "a test",
      fulfillmentMode: "full-service",
      material: "provide-own",
      files: [],
      service: serviceId,
      notes: "",
      booking: { startTime, endTime, date },
    });

    await flushScheduledFunctions(t);

    const result = await tAdmin.query(api.projects.query.getWorkshopEvents, {
      status: "all",
    });

    const allEvents = [...result.upcoming, ...result.past];
    const event = allEvents.find(
      (e) => e.serviceId === serviceId && e.startTime === startTime,
    );
    const resolvedEvent = expectPresent(
      event,
      "Expected workshop event for deleted-resource test.",
    );

    // Only the kept resource should appear; the deleted one is omitted
    expect(resolvedEvent.resources).toBeDefined();
    expect(resolvedEvent.resources?.length).toBe(1);
    const resolved = expectPresent(
      resolvedEvent.resources?.[0],
      "Expected resolved resource entry.",
    );
    expect(typeof resolved === "object" ? resolved._id : resolved).toBe(
      keptResourceId,
    );
  });
});
