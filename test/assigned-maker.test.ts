import { describe, expect, test } from "vitest";
import { flushScheduledFunctions, setupProject, setupUsers } from "./helper";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const HOUR_MS = 1000 * 60 * 60;

describe("Assigned Maker — assignedToMe filter", () => {
  // ── Setup ──────────────────────────────────────────────────────────────────
  //
  // Creates:
  //   - t        : the root Convex test instance
  //   - tHarley  : a *client* (userId "1")
  //   - tAera    : an *admin* (userId "2")
  //   - makerA   : a *maker* who will be assigned to projectA
  //   - makerB   : a *maker* who won't be assigned to any project
  //   - projectA : owned by Harley, assigned to makerA
  //   - projectB : owned by Harley, *no* assigned maker
  //
  async function setup() {
    const { t, tHarley, tAera } = await setupUsers();

    // ── Create makers ──────────────────────────────────────────────────────
    await t.mutation(internal.users.createMaker, {
      userId: "3",
      email: "makerA@test.dev",
      name: "Maker A",
    });
    await t.mutation(internal.users.createMaker, {
      userId: "4",
      email: "makerB@test.dev",
      name: "Maker B",
    });

    const makerAProfile: { _id: Id<"userProfile"> } = await t.run(
      async (ctx) => {
        const p = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "3"))
          .first();
        return { _id: p!._id };
      },
    );
    const makerBProfile: { _id: Id<"userProfile"> } = await t.run(
      async (ctx) => {
        const p = await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", "4"))
          .first();
        return { _id: p!._id };
      },
    );

    // ── Create a service (reused for both projects) ────────────────────────
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

    const now = Date.now();

    // ── Project A: assigned to makerA ──────────────────────────────────────
    const { projectId: projectAId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Project A (assigned)",
        pricing: "UP",
        description: "Assigned to Maker A",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: serviceId,
        notes: "",
        assignedMaker: makerAProfile._id,
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 2 * HOUR_MS,
          date: now + 24 * HOUR_MS,
        },
      },
    );

    // ── Project B: no assigned maker, 3 hours later to avoid slot conflict ──
    const { projectId: projectBId } = await tHarley.mutation(
      api.projects.mutate.createProject,
      {
        name: "Project B (unassigned)",
        pricing: "UP",
        description: "Unassigned",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: serviceId,
        notes: "",
        booking: {
          startTime: now + 4 * HOUR_MS,
          endTime: now + 5 * HOUR_MS,
          date: now + 24 * HOUR_MS,
        },
      },
    );

    await flushScheduledFunctions(t);

    const tMakerA = t.withIdentity({ subject: "3", name: "Maker A" });
    const tMakerB = t.withIdentity({ subject: "4", name: "Maker B" });

    return {
      t,
      tHarley,
      tAera,
      tMakerA,
      tMakerB,
      projectAId,
      projectBId,
      serviceId,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tests: getProjects list
  // ═══════════════════════════════════════════════════════════════════════════

  test("Maker sees ALL projects when assignedToMe is not set (backward compat)", async () => {
    const { tMakerA } = await setup();

    const result = await tMakerA.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
    });

    const names = result.page.map((p: any) => p.name);
    expect(names).toContain("Project A (assigned)");
    expect(names).toContain("Project B (unassigned)");
  });

  test("Maker sees only their assigned project when assignedToMe is true", async () => {
    const { tMakerA } = await setup();

    const result = await tMakerA.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
      assignedToMe: true,
    });

    const names = result.page.map((p: any) => p.name);
    expect(names).toEqual(["Project A (assigned)"]);
    expect(names).not.toContain("Project B (unassigned)");
  });

  test("Unassigned maker sees NO projects when assignedToMe is true", async () => {
    const { tMakerB } = await setup();

    const result = await tMakerB.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
      assignedToMe: true,
    });

    expect(result.page).toHaveLength(0);
  });

  test("Unassigned maker still sees ALL projects when assignedToMe is not set", async () => {
    const { tMakerB } = await setup();

    const result = await tMakerB.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
    });

    const names = result.page.map((p: any) => p.name);
    expect(names).toContain("Project A (assigned)");
    expect(names).toContain("Project B (unassigned)");
  });

  test("Admin sees ALL projects regardless of assignedToMe filter", async () => {
    const { tAera } = await setup();

    const without = await tAera.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    const withFilter = await tAera.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
      assignedToMe: true,
    });

    expect(without.page).toHaveLength(2);
    expect(withFilter.page).toHaveLength(2); // admin sees all either way
  });

  test("Client sees only their own projects regardless of assignedToMe", async () => {
    const { tHarley } = await setup();

    const without = await tHarley.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    const withFilter = await tHarley.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
      assignedToMe: true,
    });

    // Client owns both projects
    expect(without.page).toHaveLength(2);
    // assignedToMe is effectively a no-op for clients
    expect(withFilter.page).toHaveLength(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tests: getProject detail view
  // ═══════════════════════════════════════════════════════════════════════════

  test("Assigned maker can view project details via getProject", async () => {
    const { tMakerA, projectAId } = await setup();

    // Should not throw
    const project = await tMakerA.query(api.projects.query.getProject, {
      projectId: projectAId,
    });

    expect(project.name).toBe("Project A (assigned)");
  });

  test("Unassigned maker cannot view project details via getProject", async () => {
    const { tMakerB, projectAId } = await setup();

    await expect(
      tMakerB.query(api.projects.query.getProject, {
        projectId: projectAId,
      }),
    ).rejects.toThrow("You do not have permission to view this project");
  });

  test("Admin can view any project details via getProject", async () => {
    const { tAera, projectAId, projectBId } = await setup();

    const projectA = await tAera.query(api.projects.query.getProject, {
      projectId: projectAId,
    });
    const projectB = await tAera.query(api.projects.query.getProject, {
      projectId: projectBId,
    });

    expect(projectA.name).toBe("Project A (assigned)");
    expect(projectB.name).toBe("Project B (unassigned)");
  });

  test("Owner client can view their own project's details", async () => {
    const { tHarley, projectAId } = await setup();

    const project = await tHarley.query(api.projects.query.getProject, {
      projectId: projectAId,
    });

    expect(project.name).toBe("Project A (assigned)");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tests: Calendar helper (loadOwnedProjectIds)
  // ═══════════════════════════════════════════════════════════════════════════

  test("Calendar: maker sees details for assigned projects; unassigned bookings are masked", async () => {
    const { tMakerA, tMakerB, tAera, projectAId, projectBId } = await setup();

    // Fetch a wide calendar range that covers both projects
    const startTime = Date.now() - 24 * HOUR_MS;
    const endTime = Date.now() + 48 * HOUR_MS;

    // Maker A (assigned to projectA) should see project A's details but not project B's
    const makerABookings = await tMakerA.query(
      api.calendar.query.getCalendarBookings,
      { startTime, endTime, tab: "services" },
    );

    const makerAProjectIds = makerABookings
      .filter((b: any) => b.projectId !== null)
      .map((b: any) => b.projectId);

    expect(makerAProjectIds).toContain(projectAId);
    expect(makerAProjectIds).not.toContain(projectBId);

    // Maker B (no assignments) should see all null projectIds (masked)
    const makerBBookings = await tMakerB.query(
      api.calendar.query.getCalendarBookings,
      { startTime, endTime, tab: "services" },
    );

    const makerBVisible = makerBBookings.filter(
      (b: any) => b.projectId !== null,
    );
    expect(makerBVisible).toHaveLength(0);

    // Admin sees all unmasked
    const adminBookings = await tAera.query(
      api.calendar.query.getCalendarBookings,
      { startTime, endTime, tab: "services" },
    );

    const adminProjectIds = adminBookings
      .filter((b: any) => b.projectId !== null)
      .map((b: any) => b.projectId);

    expect(adminProjectIds).toContain(projectAId);
    expect(adminProjectIds).toContain(projectBId);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tests: assignedToMe combines with other filters
  // ═══════════════════════════════════════════════════════════════════════════

  test("assignedToMe stacks with status filter", async () => {
    const { t, tAera, tMakerA, projectAId } = await setup();

    // Both projects start as "pending"
    const pendingAssigned = await tMakerA.query(
      api.projects.query.getProjects,
      {
        paginationOpts: { cursor: null, numItems: 10 },
        statusFilter: "pending",
        assignedToMe: true,
      },
    );

    const pendingNames = pendingAssigned.page.map((p: any) => p.name);
    expect(pendingNames).toEqual(["Project A (assigned)"]);

    // Change project A to "approved"
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId: projectAId,
      status: "approved",
    });
    await flushScheduledFunctions(t);

    // Now "pending" filter should return 0 for maker A
    const afterApproved = await tMakerA.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
      statusFilter: "pending",
      assignedToMe: true,
    });

    expect(afterApproved.page).toHaveLength(0);

    // But "approved" + assignedToMe returns project A
    const approvedAssigned = await tMakerA.query(
      api.projects.query.getProjects,
      {
        paginationOpts: { cursor: null, numItems: 10 },
        statusFilter: "approved",
        assignedToMe: true,
      },
    );

    expect(approvedAssigned.page).toHaveLength(1);
    expect(approvedAssigned.page[0].name).toBe("Project A (assigned)");
  });

  test("assignedToMe stacks with search filter", async () => {
    const { tMakerA } = await setup();

    // Search for "assigned" — only project A matches
    const result = await tMakerA.query(api.projects.query.getProjects, {
      paginationOpts: { cursor: null, numItems: 10 },
      searchText: "assigned",
      assignedToMe: true,
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0].name).toBe("Project A (assigned)");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tests: Chat room membership
  // ═══════════════════════════════════════════════════════════════════════════

  test("Pre-assigned maker is added to the project chat room on creation", async () => {
    const { t, projectAId } = await setup();

    // Find the room for project A (created with assignedMaker = makerA)
    const { roomId, makerAId } = await t.run(async (ctx) => {
      const threadA = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectAId))
        .first();
      expect(threadA).not.toBeNull();

      const makerA = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "3"))
        .first();

      return { roomId: threadA!.roomId, makerAId: makerA!._id };
    });

    const roomMembers = await t.run(async (ctx) => {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), roomId))
        .collect();
      return members.map((m) => m.participantId);
    });

    // Maker A should be a member of the project's room
    expect(roomMembers).toContain(makerAId);
  });

  test("Assigning a maker via updateProject adds them to the chat room", async () => {
    const { t, tAera, projectBId } = await setup();

    const { makerBId, roomId } = await t.run(async (ctx) => {
      const makerB = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "4"))
        .first();
      const thread = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectBId))
        .first();
      return { makerBId: makerB!._id, roomId: thread!.roomId };
    });

    // makerB should NOT be in the room yet (never assigned anywhere)
    const before = await t.run(async (ctx) => {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), roomId))
        .collect();
      return members.map((m) => m.participantId);
    });
    expect(before).not.toContain(makerBId);

    // Assign makerB to project B
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId: projectBId,
      makerId: makerBId,
    });
    await flushScheduledFunctions(t);

    // Verify makerB is now a room member
    const after = await t.run(async (ctx) => {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), roomId))
        .collect();
      return members.map((m) => m.participantId);
    });

    expect(after).toContain(makerBId);
  });

  test("Reassigning a maker removes old maker and adds new maker to the chat room", async () => {
    const { t, tAera, projectAId } = await setup();

    const { makerAId, makerBId, roomId } = await t.run(async (ctx) => {
      const makerA = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "3"))
        .first();
      const makerB = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "4"))
        .first();
      const thread = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectAId))
        .first();
      return {
        makerAId: makerA!._id,
        makerBId: makerB!._id,
        roomId: thread!.roomId,
      };
    });

    // Verify makerA is initially in the room (pre-assigned on creation)
    const before = await t.run(async (ctx) => {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), roomId))
        .collect();
      return members.map((m) => m.participantId);
    });
    expect(before).toContain(makerAId);

    // Reassign: replace makerA with makerB
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId: projectAId,
      makerId: makerBId,
    });
    await flushScheduledFunctions(t);

    // Verify makerA is removed and makerB is added
    const after = await t.run(async (ctx) => {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), roomId))
        .collect();
      return members.map((m) => m.participantId);
    });

    expect(after).toContain(makerBId);
    expect(after).not.toContain(makerAId);
  });

  test("Unassigning a maker via null makerId clears assignment and removes from room", async () => {
    const { t, tAera, projectAId } = await setup();

    const { makerAId, roomId } = await t.run(async (ctx) => {
      const makerA = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "3"))
        .first();
      const thread = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectAId))
        .first();
      return { makerAId: makerA!._id, roomId: thread!.roomId };
    });

    // Verify makerA is assigned
    const before = await t.run(async (ctx) => {
      const project = await ctx.db.get(projectAId);
      return project!.assignedMaker;
    });
    expect(before).toBe(makerAId);

    // Unassign: pass null to clear the maker
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId: projectAId,
      makerId: null,
    });
    await flushScheduledFunctions(t);

    // Verify makerA is no longer assigned (Convex returns null for cleared optional fields)
    const after = await t.run(async (ctx) => {
      const project = await ctx.db.get(projectAId);
      return project!.assignedMaker;
    });
    expect(after).toBeNull();

    // Verify makerA is removed from the room
    const roomMemberIds = await t.run(async (ctx) => {
      const members = await ctx.db
        .query("roomMembers")
        .filter((q) => q.eq(q.field("roomId"), roomId))
        .collect();
      return members.map((m) => m.participantId);
    });
    expect(roomMemberIds).not.toContain(makerAId);
  });

  test("Unassigning an already-unassigned project is a no-op", async () => {
    const { t, tAera, projectBId } = await setup();

    // Project B has no assigned maker
    const before = await t.run(async (ctx) => {
      const project = await ctx.db.get(projectBId);
      return project!.assignedMaker;
    });
    expect(before).toBeNull();

    // Attempting to unassign should not throw
    await tAera.mutation(api.projects.mutate.updateProject, {
      projectId: projectBId,
      makerId: null,
    });
    await flushScheduledFunctions(t);

    // Still unassigned
    const after = await t.run(async (ctx) => {
      const project = await ctx.db.get(projectBId);
      return project!.assignedMaker;
    });
    expect(after).toBeNull();
  });

  test("Assigned maker can see chat messages in the project room", async () => {
    const { t, tMakerA, tHarley, projectAId } = await setup();

    // Maker A should be able to query the room (chat queries check membership)
    const threadId = await t.run(async (ctx) => {
      const thread = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectAId))
        .first();
      return thread!._id;
    });

    // Maker A can query the room's messages (convex chat query checks membership)
    const roomId = await t.run(async (ctx) => {
      const thread = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectAId))
        .first();
      return thread!.roomId;
    });

    // getRooms should return the room for Maker A
    const makerARooms = await tMakerA.query(api.chat.query.getRooms);
    const makerARoomIds = makerARooms.map((r: any) => r._id);
    expect(makerARoomIds).toContain(roomId);

    // Maker A can retrieve messages from the project thread
    const messages = await tMakerA.query(api.chat.query.getRoomMessages, {
      paginationOpts: { cursor: null, numItems: 10 },
      room: roomId,
      threadId,
    });
    expect(messages.page.length).toBeGreaterThan(0);
  });

  test("Unassigned maker cannot see chat messages in the project room", async () => {
    const { t, tMakerB, projectAId } = await setup();

    const roomId = await t.run(async (ctx) => {
      const thread = await ctx.db
        .query("threads")
        .withIndex("projectId", (q) => q.eq("projectId", projectAId))
        .first();
      return thread!.roomId;
    });

    // Maker B should NOT have the room in their room list
    const makerBRooms = await tMakerB.query(api.chat.query.getRooms);
    const makerBRoomIds = makerBRooms.map((r: any) => r._id);
    expect(makerBRoomIds).not.toContain(roomId);
  });
});
