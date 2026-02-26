import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

test("sending message", async () => {
  const t = convexTest(schema);

  // Create Initial Users for mock
  await t.mutation(internal.users.createUserProfile, {
    userId: "1",
    email: "hello@gmail.com",
    name: "Harley",
  });
  await t.mutation(internal.users.createUserProfile, {
    userId: "2",
    email: "hello2@gmail.com",
    name: "Aera",
  });

  await t.mutation(api.chat.mutate.createRoom, { name: "testing room", participants: })

});
