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
    description: "std to 3d printed model",
    type: "prints",
    status: "Available",
  });

  const serviceId = await t.run(async (ctx) => {
    const service = await ctx.db.query("services").first();

    return service!._id;
  });

  await tHarley.mutation(api.projects.mutate.createProject, {
    pricing: "UP",
    files: [],
    service: serviceId,
    specialInstructions: "pls na",
  });

  const { projectId, roomId } = await t.run(async (ctx) => {
    const project = await ctx.db.query("projects").first();
    const room = await ctx.db.query("rooms").first();

    return { projectId: project!._id, roomId: room!._id };
  });

  return { t, tHarley, tAera, serviceId, projectId, roomId };
}

export async function setupService() {
  const { tHarley, tAera } = await setupUsers();
}
