import { describe, expect, test } from "vitest";
import { setupProject } from "./helper";
import { api } from "../_generated/api";

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
      expect(room[0].name).toBe("Harley's Workspace");

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
        "Welcome to Harley's Workspace! This is your main room for general inquiries.",
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

  test("Update Project (Privileged - Owner, Admin, Maker)", async () => {});
  test("Update Project (Non-privileged)", async () => {});
});
