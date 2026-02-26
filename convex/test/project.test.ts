import { describe, expect, test } from "vitest";
import { setupProject } from "./helper";

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
      expect(project[0].alias).toBe("3d printing - Harley");
      expect(project[0].status).toBe("pending");
      expect(project[0].userId).toBe(userHarley!._id);

      // Check if the room was added
      const room = await ctx.db.query("rooms").collect();
      expect(room.length).toBe(1);
      expect(room[0].color).toBe("yellow");
      expect(room[0].lastMessageId).toBe(undefined);
      expect(room[0].name).toBe("3d printing - Harley");

      // check room members
      const members = await ctx.db.query("roomMembers").collect();
      expect(members.length).toBe(2);
      expect(members[0].roomId).toBe(room[0]._id);
      expect(members[0].participantId).toBe(userHarley!._id);
      expect(members[1].participantId).toBe(userAera!._id);

      // check chat
      const message = await ctx.db.query("messages").collect();
      expect(message.length).toBe(1);
      expect(message[0].room).toBe(room[0]._id);
      expect(message[0].sender).toBe("System");
      expect(message[0].content).toBe(
        "Generated room for project: 3d printing - Harley",
      );
    });
  });

  test("Chat messaging", async () => {});
});
