import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { DataModel } from "../convex/_generated/dataModel";
import { getLabDayStartTimestamp } from "../src/lib/lab-time";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import resendComponent from "@convex-dev/resend/test";
import { TestConvexForDataModel } from "convex-test";

process.env.RESEND_TEST_MODE = "true";
process.env.RESEND_API_KEY ??= "test-api-key";
process.env.DISABLE_SCHEDULED_EMAILS = "true";

const HOUR_MS = 1000 * 60 * 60;

describe("workshop lifecycle edge cases", () => {
  async function setup() {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.{ts,tsx}"));
    rateLimiterComponent.register(t);
    resendComponent.register(t);

    await t.mutation(internal.users.createUserProfile, {
      userId: "1",
      email: "client@example.com",
      name: "Client",
    });
    await t.mutation(internal.users.createAdmin, {
      userId: "2",
      email: "admin@example.com",
      name: "Admin",
    });

    const tClient = t.withIdentity({ subject: "1", name: "Client" });
    const tAdmin = t.withIdentity({ subject: "2", name: "Admin" });

    return { t, tClient, tAdmin };
  }

  async function createWorkshopService(
    tAdmin: TestConvexForDataModel<DataModel>,
  ) {
    return await tAdmin.mutation(api.services.mutate.addService, {
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

  test("cancelling a workshop session does not cancel the booked projects (REPRODUCTION)", async () => {
    const { t, tClient, tAdmin } = await setup();
    const serviceId = await createWorkshopService(tAdmin);

    const now = Date.now();
    const futureDate = now + 7 * 24 * HOUR_MS;
    const dayStart = getLabDayStartTimestamp(futureDate);
    const startTime = dayStart + 9 * HOUR_MS;
    const endTime = startTime + 2 * HOUR_MS;

    // 1. Create a session
    const sessionId = await tAdmin.mutation(
      api.workshopSessions.mutate.create,
      {
        serviceId,
        date: dayStart,
        startTime,
        endTime,
        maxSlots: 10,
      },
    );

    // 2. Client books the workshop
    const { projectId } = await tClient.mutation(
      api.projects.mutate.createProject,
      {
        name: "My Workshop Project",
        description: "I want to learn 3D printing",
        fulfillmentMode: "self-service",
        material: "provide-own",
        service: serviceId,
        pricing: "Default",
        notes: "None",
        booking: {
          startTime,
          endTime,
          date: dayStart,
        },
      },
    );

    // Verify project is pending and session has 1 slot used
    let project = await t.run(async (ctx) => ctx.db.get(projectId));
    let session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(project!.status).toBe("pending");
    expect(session!.usedUpSlots).toBe(1);

    // 3. Admin cancels the session
    await tAdmin.mutation(api.workshopSessions.mutate.cancel, { sessionId });

    // 4. Verify the session is cancelled BUT the project is still pending (THE ISSUE)
    session = await t.run(async (ctx) => ctx.db.get(sessionId));
    project = await t.run(async (ctx) => ctx.db.get(projectId));

    expect(session!.status).toBe("cancelled");
    expect(project!.status).toBe("cancelled"); // This SHOULD be cancelled
    expect(session!.usedUpSlots).toBe(0); // The slot SHOULD be released
  });
});
