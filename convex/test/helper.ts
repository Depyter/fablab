import schema from "../schema";
import { convexTest } from "convex-test";
import { internal, api } from "../_generated/api";

/**
 *
 * @returns Two users, Harley (Client) and Aera (Admin) roles.
 */
export async function setupUsers() {
  const t = convexTest(schema);

  // Create Initial Users for mock
  await t.mutation(internal.users.createUserProfile, {
    userId: "1",
    email: "hello@gmail.com",
    name: "Harley",
  });

  await t.mutation(internal.users.createAdmin, {
    userId: "2",
    email: "hello2@gmail.com",
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
    serviceCategory: "FABRICATION",
    pricing: {
      type: "COMPOSITE",
      baseFee: 1,
      timeRatePerHour: 2,
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
    name: "test",
    pricing: "UP",
    description: "hello",
    serviceType: "self-service",
    material: "provide-own",
    files: [],
    service: serviceId,
    notes: "pls na",
    booking: {
      startTime: Date.now() + 1000 * 60 * 60,
      endTime: Date.now() + 1000 * 60 * 60 * 2,
      date: Date.now() + 1000 * 60 * 60 * 24,
    },
  });

  const { projectId, roomId } = await t.run(async (ctx) => {
    const project = await ctx.db.query("projects").first();
    const room = await ctx.db.query("rooms").first();

    return { projectId: project!._id, roomId: room!._id };
  });

  return { t, tHarley, tAera, serviceId, projectId, roomId };
}
