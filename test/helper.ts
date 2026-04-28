import schema from "../convex/schema";
import { convexTest } from "convex-test";
import { api, internal } from "../convex/_generated/api";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";

process.env.RESEND_TEST_MODE = "true";
process.env.RESEND_API_KEY ??= "test-api-key";
process.env.DISABLE_SCHEDULED_EMAILS = "true";

export async function flushScheduledFunctions(t: {
  finishAllScheduledFunctions: (advanceTimers: () => void) => Promise<void>;
}) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await t.finishAllScheduledFunctions(() => {});
}

/**
 *
 * @returns Two users, Harley (Client) and Aera (Admin) roles.
 */
export async function setupUsers() {
  const t = convexTest(schema, import.meta.glob("../convex/**/*.{ts,tsx}"));
  rateLimiterComponent.register(t);

  // Create Initial Users for mock
  await t.mutation(internal.users.createUserProfile, {
    userId: "1",
    email: "delivered+harley@resend.dev",
    name: "Harley",
  });

  await t.mutation(internal.users.createAdmin, {
    userId: "2",
    email: "delivered+aera@resend.dev",
    name: "Aera",
  });

  const tHarley = t.withIdentity({ subject: "1", name: "Harley" });
  const tAera = t.withIdentity({ subject: "2", name: "Aera" });

  return { t, tHarley, tAera };
}

export async function setupProject() {
  const { t, tHarley, tAera } = await setupUsers();

  await tAera.mutation(api.services.mutate.addService, {
    name: "3d printing",
    images: [],
    samples: [],
    serviceCategory: {
      type: "FABRICATION",
      materials: [],
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

  const { projectId, roomId, threadId } = await tHarley.mutation(
    api.projects.mutate.createProject,
    {
      name: "test",
      pricing: "UP",
      description: "hello",
      fulfillmentMode: "self-service",
      material: "provide-own",
      files: [],
      service: serviceId,
      notes: "pls na",
      booking: {
        startTime: Date.now() + 1000 * 60 * 60,
        endTime: Date.now() + 1000 * 60 * 60 * 2,
        date: Date.now() + 1000 * 60 * 60 * 24,
      },
    },
  );

  await flushScheduledFunctions(t);

  return {
    t,
    tHarley,
    tAera,
    serviceId,
    projectId,
    roomId,
    threadId,
  };
}
