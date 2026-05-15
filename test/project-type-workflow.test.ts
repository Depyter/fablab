import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import resendComponent from "@convex-dev/resend/test";
import { flushScheduledFunctions } from "./helper";

process.env.RESEND_TEST_MODE = "true";
process.env.RESEND_API_KEY ??= "test-api-key";
process.env.DISABLE_SCHEDULED_EMAILS = "true";

const HOUR_MS = 1000 * 60 * 60;

describe("Type-aware project workflows", () => {
  // ── Setup helpers ──────────────────────────────────────────────────────────

  async function setupWorkshopProject() {
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
      name: "3d printing workshop",
      images: [],
      samples: [],
      serviceCategory: {
        type: "WORKSHOP",
        amount: 500,
        schedules: [
          {
            date,
            timeSlots: [{ startTime, endTime, maxSlots: 10 }],
          },
        ],
      },
      requirements: [],
      fileTypes: [],
      description: "Learn 3d printing",
      status: "Available",
    });

    const serviceId = await t.run(async (ctx) => {
      const service = await ctx.db.query("services").first();
      return service!._id;
    });

    const { projectId, roomId, threadId } = await tClient.mutation(
      api.projects.mutate.createProject,
      {
        name: "workshop project",
        pricing: "Default",
        description: "a workshop",
        fulfillmentMode: "full-service",
        material: "provide-own",
        files: [],
        service: serviceId,
        notes: "",
        booking: { startTime, endTime, date },
      },
    );

    await flushScheduledFunctions(t);

    return { t, tClient, tAdmin, serviceId, projectId, roomId, threadId };
  }

  async function setupFabricationProject() {
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

    await t.mutation(internal.users.createMaker, {
      userId: "3",
      email: "delivered+maker@resend.dev",
      name: "Maker",
    });

    const tClient = t.withIdentity({ subject: "1", name: "Client" });
    const tAdmin = t.withIdentity({ subject: "2", name: "Admin" });

    await tAdmin.mutation(api.services.mutate.addService, {
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
      requirements: [],
      fileTypes: [],
      description: "std to 3d printed model",
      status: "Available",
    });

    const serviceId = await t.run(async (ctx) => {
      const service = await ctx.db.query("services").first();
      return service!._id;
    });

    const now = Date.now();
    const { projectId, roomId, threadId } = await tClient.mutation(
      api.projects.mutate.createProject,
      {
        name: "fabrication project",
        pricing: "Default",
        description: "a fabrication job",
        fulfillmentMode: "self-service",
        material: "provide-own",
        files: [],
        service: serviceId,
        notes: "",
        booking: {
          startTime: now + HOUR_MS,
          endTime: now + 2 * HOUR_MS,
          date: now + 24 * HOUR_MS,
        },
      },
    );

    await flushScheduledFunctions(t);

    // Find the maker to pass when transitioning to approved
    const makerId = await t.run(async (ctx) => {
      const maker = await ctx.db
        .query("userProfile")
        .withIndex("by_role", (q) => q.eq("role", "maker"))
        .first();
      return maker!._id;
    });

    return {
      t,
      tClient,
      tAdmin,
      serviceId,
      projectId,
      roomId,
      threadId,
      makerId,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // markProjectPaid — type-aware payment gates
  // ══════════════════════════════════════════════════════════════════════════

  describe("markProjectPaid — type-aware payment status gates", () => {
    test(
      "workshop project can be marked paid from approved status (pre-pay)",
      { timeout: 15_000 },
      async () => {
        const { t, tAdmin, projectId } = await setupWorkshopProject();

        await tAdmin.mutation(api.projects.mutate.updateProject, {
          projectId,
          status: "approved",
        });

        await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
          projectId,
          receiptString: "WS-001",
          paymentMode: "gcash",
          proof: "GCash ref: ABC123",
        });

        await t.run(async (ctx) => {
          const project = await ctx.db.get(projectId);
          expect(project!.status).toBe("paid");
          expect(project!.receipt).toBeDefined();
        });
      },
    );

    test(
      "workshop project can skip completed and go directly to paid from approved",
      { timeout: 15_000 },
      async () => {
        const { t, tAdmin, projectId } = await setupWorkshopProject();

        await tAdmin.mutation(api.projects.mutate.updateProject, {
          projectId,
          status: "approved",
        });

        await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
          projectId,
          receiptString: "WS-002",
          paymentMode: "cash",
          proof: "Cash payment",
        });

        await t.run(async (ctx) => {
          const project = await ctx.db.get(projectId);
          expect(project!.status).toBe("paid");
        });

        await tAdmin.mutation(api.projects.mutate.updateProject, {
          projectId,
          status: "completed",
        });

        await t.run(async (ctx) => {
          const project = await ctx.db.get(projectId);
          expect(project!.status).toBe("completed");
        });
      },
    );

    test("fabrication project cannot be marked paid from approved status", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });

      await expect(
        tAdmin.mutation(api.projects.mutate.markProjectPaid, {
          projectId,
          receiptString: "FAB-001",
          paymentMode: "cash",
          proof: "Test payment",
        }),
      ).rejects.toThrow("Project is not currently payable.");
    });

    test("fabrication project can be marked paid from completed status", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });

      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "FAB-002",
        paymentMode: "bank transfer",
        proof: "BDO transfer ref: 98765",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        expect(project!.status).toBe("paid");
      });
    });

    test("both types can re-pay from paid status (update receipt)", async () => {
      const { t, tAdmin, projectId } = await setupWorkshopProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });

      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "WS-003",
        paymentMode: "cash",
        proof: "Initial payment",
      });

      const firstReceiptId = await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        return project!.receipt;
      });

      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "WS-003-UPDATED",
        paymentMode: "gcash",
        proof: "Updated payment reference",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        expect(project!.status).toBe("paid");
        expect(project!.receipt).toBe(firstReceiptId);

        const receipt = await ctx.db.get(project!.receipt!);
        expect(receipt!.receiptString).toBe("WS-003-UPDATED");
        expect(receipt!.paymentMode).toBe("gcash");
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // System message type-awareness
  // ══════════════════════════════════════════════════════════════════════════

  describe("markProjectPaid — system messages", () => {
    test("workshop payment produces 'workshop confirmed' system message", async () => {
      const { t, tAdmin, projectId, roomId, threadId } =
        await setupWorkshopProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });

      await withScheduledEmailsEnabled(async () => {
        await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
          projectId,
          receiptString: "WS-MSG",
          paymentMode: "cash",
          proof: "Counter payment",
        });
      });

      await flushScheduledFunctions(t);

      await t.run(async (ctx) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        const paymentMessage = messages.find(
          (msg) =>
            msg.sender === "System" && msg.content.includes("Payment recorded"),
        );

        expect(paymentMessage).toBeDefined();
        expect(paymentMessage!.content).toContain("workshop confirmed");
        expect(paymentMessage!.content).not.toContain("claim");
      });
    });

    test("fabrication payment produces 'claim' system message", async () => {
      const { t, tAdmin, projectId, roomId, threadId, makerId } =
        await setupFabricationProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });

      await withScheduledEmailsEnabled(async () => {
        await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
          projectId,
          receiptString: "FAB-MSG",
          paymentMode: "cash",
          proof: "Cash at counter",
        });
      });

      await flushScheduledFunctions(t);

      await t.run(async (ctx) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        const paymentMessage = messages.find(
          (msg) =>
            msg.sender === "System" && msg.content.includes("Payment recorded"),
        );

        expect(paymentMessage).toBeDefined();
        expect(paymentMessage!.content).toContain("claim");
        expect(paymentMessage!.content).not.toContain("workshop confirmed");
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Backward status navigation — regression tests
  // ══════════════════════════════════════════════════════════════════════════

  describe("backward status navigation", () => {
    // ── Workshop backward moves ──────────────────────────────────────────────

    test("workshop: approved can go back to pending", async () => {
      const { t, tAdmin, projectId } = await setupWorkshopProject();

      // Move forward: pending → approved
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });

      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("approved");
      });

      // Move backward: approved → pending
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "pending",
      });

      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("pending");
      });
    });

    test("workshop: paid cannot go back to approved (not a valid transition)", async () => {
      const { tAdmin, projectId } = await setupWorkshopProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "WS-BACK-001",
        paymentMode: "cash",
        proof: "Paid",
      });

      await expect(
        tAdmin.mutation(api.projects.mutate.updateProject, {
          projectId,
          status: "approved",
        }),
      ).rejects.toThrow("Cannot change project status from paid to approved");
    });

    test("workshop: completed can go back to paid", async () => {
      const { t, tAdmin, projectId } = await setupWorkshopProject();

      // Forward: pending → approved → paid → completed
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "WS-BACK-002",
        paymentMode: "cash",
        proof: "Paid",
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("completed");
      });

      // Backward: completed → paid
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "paid",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("paid");
      });
    });

    // ── Fabrication backward moves ──────────────────────────────────────────

    test("fabrication: approved can go back to pending", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("approved");
      });

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "pending",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("pending");
      });
    });

    test("fabrication: completed can go back to approved", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("completed");
      });

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("approved");
      });
    });

    test("fabrication: paid can go back to completed", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();

      // Forward: pending → approved → completed → paid
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "FAB-BACK-001",
        paymentMode: "cash",
        proof: "Paid",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("paid");
      });

      // Backward: paid → completed
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("completed");
      });
    });

    test("fabrication: claimed can go back to paid", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();

      // Forward: pending → approved → completed → paid → claimed
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "FAB-BACK-002",
        paymentMode: "cash",
        proof: "Paid",
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "claimed",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("claimed");
      });

      // Backward: claimed → paid
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "paid",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("paid");
      });
    });

    // ── Edge cases ──────────────────────────────────────────────────────────

    test("rejected can go back to pending", async () => {
      const { t, tAdmin, projectId } = await setupWorkshopProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "rejected",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("rejected");
      });

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "pending",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("pending");
      });
    });

    test("cancelled can go back to pending", async () => {
      const { t, tAdmin, projectId } = await setupFabricationProject();

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "cancelled",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("cancelled");
      });

      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "pending",
      });
      await t.run(async (ctx) => {
        expect((await ctx.db.get(projectId))!.status).toBe("pending");
      });
    });

    test("system message is sent when moving backward", async () => {
      const { t, tAdmin, projectId, roomId, threadId } =
        await setupWorkshopProject();

      // Forward
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });

      // Backward: approved → pending
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "pending",
      });

      await t.run(async (ctx) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_thread", (q) =>
            q.eq("room", roomId).eq("threadId", threadId),
          )
          .collect();

        // The last system message should mention the backward transition
        const systemMessages = messages.filter((m) => m.sender === "System");
        const lastSystemMsg = systemMessages[systemMessages.length - 1];
        expect(lastSystemMsg).toBeDefined();
        expect(lastSystemMsg.content).toContain("Status updated to");
        expect(lastSystemMsg.content).toContain("Review");
      });
    });

    test("forward and backward cycle does not corrupt project data", async () => {
      const { t, tAdmin, projectId, makerId } = await setupFabricationProject();
      const originalName = "fabrication project";

      // Cycle: pending → approved → completed → approved → completed → paid → completed → paid
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
        makerId,
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "approved",
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await tAdmin.mutation(api.projects.mutate.markProjectPaid, {
        projectId,
        receiptString: "FAB-CYCLE",
        paymentMode: "gcash",
        proof: "Cycle test",
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "completed",
      });
      await tAdmin.mutation(api.projects.mutate.updateProject, {
        projectId,
        status: "paid",
      });

      await t.run(async (ctx) => {
        const project = await ctx.db.get(projectId);
        expect(project!.status).toBe("paid");
        expect(project!.name).toBe(originalName);
        expect(project!.receipt).toBeDefined();

        const receipt = await ctx.db.get(project!.receipt!);
        expect(receipt!.receiptString).toBe("FAB-CYCLE");
        expect(receipt!.proof).toBe("Cycle test");
      });
    });
  });
});

async function withScheduledEmailsEnabled<T>(callback: () => Promise<T>) {
  const previousValue = process.env.DISABLE_SCHEDULED_EMAILS;
  process.env.DISABLE_SCHEDULED_EMAILS = "false";

  try {
    return await callback();
  } finally {
    if (previousValue === undefined) {
      delete process.env.DISABLE_SCHEDULED_EMAILS;
    } else {
      process.env.DISABLE_SCHEDULED_EMAILS = previousValue;
    }
  }
}
