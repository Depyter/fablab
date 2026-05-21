import { v, ConvexError } from "convex/values";
import { authMutation } from "../helper";
import {
  sendProjectSystemMessage,
  scheduleProjectUpdateEmail,
} from "../projects/helper";

// ─── Create a new session for a workshop service ───────────────────────────
// Inherits defaults (resources, materials) from the service unless overridden.
export const create = authMutation({
  role: ["admin", "maker"],
  args: {
    serviceId: v.id("services"),
    date: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    maxSlots: v.number(),
    resources: v.optional(v.array(v.id("resources"))),
    availableMaterials: v.optional(v.array(v.id("materials"))),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new ConvexError("Service not found.");
    if (service.serviceCategory.type !== "WORKSHOP") {
      throw new ConvexError(
        "Sessions can only be created for WORKSHOP services.",
      );
    }

    if (args.startTime >= args.endTime) {
      throw new ConvexError("End time must be after start time.");
    }

    if (args.maxSlots < 1) {
      throw new ConvexError("maxSlots must be at least 1.");
    }

    const resolvedResources = args.resources ?? service.resources;
    const resolvedMaterials = args.availableMaterials ?? [];

    return ctx.db.insert("workshopSessions", {
      serviceId: args.serviceId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      maxSlots: args.maxSlots,
      usedUpSlots: 0,
      resources: resolvedResources,
      availableMaterials: resolvedMaterials,
      status: "active",
    });
  },
});

// ─── Update an existing session ────────────────────────────────────────────
export const update = authMutation({
  role: ["admin", "maker"],
  args: {
    sessionId: v.id("workshopSessions"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    maxSlots: v.optional(v.number()),
    resources: v.optional(v.array(v.id("resources"))),
    availableMaterials: v.optional(v.array(v.id("materials"))),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("completed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...patches } = args;
    const session = await ctx.db.get(sessionId);
    if (!session) throw new ConvexError("Session not found.");

    const updates: Record<string, unknown> = {};

    if (patches.startTime !== undefined) updates.startTime = patches.startTime;
    if (patches.endTime !== undefined) updates.endTime = patches.endTime;

    if (patches.maxSlots !== undefined) {
      if (patches.maxSlots < session.usedUpSlots) {
        throw new ConvexError(
          `Cannot reduce maxSlots below ${session.usedUpSlots} (already used).`,
        );
      }
      updates.maxSlots = patches.maxSlots;
    }

    if (patches.resources !== undefined) updates.resources = patches.resources;
    if (patches.availableMaterials !== undefined)
      updates.availableMaterials = patches.availableMaterials;
    if (patches.status !== undefined) updates.status = patches.status;

    await ctx.db.patch(sessionId, updates);
  },
});

// ─── Update session and notify attendees of meaningful changes ─────────────
// Skips notification when only resources/materials change (no schedule impact).
export const updateAndNotify = authMutation({
  role: ["admin", "maker"],
  args: {
    sessionId: v.id("workshopSessions"),
    date: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    maxSlots: v.optional(v.number()),
    resources: v.optional(v.array(v.id("resources"))),
    availableMaterials: v.optional(v.array(v.id("materials"))),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...patches } = args;
    const session = await ctx.db.get(sessionId);
    if (!session) throw new ConvexError("Session not found.");

    const updates: Record<string, unknown> = {};
    let hasScheduleChange = false;

    if (patches.startTime !== undefined) {
      if (patches.startTime !== session.startTime) hasScheduleChange = true;
      const newEnd = patches.endTime ?? session.endTime;
      if (patches.startTime >= newEnd) {
        throw new ConvexError("End time must be after start time.");
      }
      updates.startTime = patches.startTime;
    }
    if (patches.endTime !== undefined) {
      if (patches.endTime !== session.endTime) hasScheduleChange = true;
      const newStart = patches.startTime ?? session.startTime;
      if (newStart >= patches.endTime) {
        throw new ConvexError("End time must be after start time.");
      }
      updates.endTime = patches.endTime;
    }
    if (patches.date !== undefined) {
      if (patches.date !== session.date) hasScheduleChange = true;
      updates.date = patches.date;
    }
    if (patches.maxSlots !== undefined) {
      if (patches.maxSlots < session.usedUpSlots) {
        throw new ConvexError(
          `Cannot reduce maxSlots below ${session.usedUpSlots} (already used).`,
        );
      }
      if (patches.maxSlots !== session.maxSlots) hasScheduleChange = true;
      updates.maxSlots = patches.maxSlots;
    }

    if (patches.resources !== undefined) updates.resources = patches.resources;
    if (patches.availableMaterials !== undefined)
      updates.availableMaterials = patches.availableMaterials;

    await ctx.db.patch(sessionId, updates);

    // Notify attendees only for meaningful schedule changes
    if (!hasScheduleChange) return;

    // Query all projects booked for this session (active OR terminal)
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_type_bookingStartTime", (q) =>
        q.eq("type", "WORKSHOP").eq("bookingStartTime", session.startTime),
      )
      .filter((q) => q.eq(q.field("service"), session.serviceId))
      .collect();

    if (projects.length === 0) return;

    const active = projects.filter(
      (p) => !["cancelled", "rejected"].includes(p.status),
    );

    const service = await ctx.db.get(session.serviceId);
    const svcName = service?.name ?? "Workshop";

    const newStart = (updates.startTime ?? session.startTime) as number;
    const newEnd = (updates.endTime ?? session.endTime) as number;
    const newDate = (updates.date ?? session.date) as number;

    const dateStr = new Date(newDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFmt = (t: number) =>
      new Date(t).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      });

    const lines = [
      `**Workshop schedule updated: ${svcName}**`,
      `📅 ${dateStr}`,
      `🕐 ${timeFmt(newStart)} – ${timeFmt(newEnd)}`,
    ];
    if (updates.maxSlots !== undefined) {
      lines.push(
        `👥 Capacity: ${updates.maxSlots} slot${(updates.maxSlots as number) > 1 ? "s" : ""}`,
      );
    }

    // Phase 1: sync project bookings + resource usages (must succeed before notify)
    for (const p of projects) {
      const projectPatches: Record<string, unknown> = {};
      if (patches.startTime !== undefined || patches.date !== undefined) {
        projectPatches.bookingStartTime = newStart;
      }
      if (patches.endTime !== undefined || patches.date !== undefined) {
        projectPatches.bookingEndTime = newEnd;
      }
      if (Object.keys(projectPatches).length > 0) {
        await ctx.db.patch(p._id, projectPatches);

        // Sync all resourceUsage records for this project + service
        const usages = await ctx.db
          .query("resourceUsage")
          .withIndex("by_service", (q) => q.eq("service", session.serviceId))
          .filter((q) => q.eq(q.field("projectId"), p._id))
          .collect();
        for (const u of usages) {
          await ctx.db.patch(u._id, {
            startTime: newStart,
            endTime: newEnd,
          });
        }
      }
    }

    // Phase 2: notify attendees in parallel — one failure doesn't block others
    await Promise.allSettled(
      active.map((p) =>
        (async () => {
          await sendProjectSystemMessage(ctx, p._id, lines);
          await scheduleProjectUpdateEmail(ctx, p._id);
        })(),
      ),
    );
  },
});

// ─── Cancel a session (soft-delete) ────────────────────────────────────────
export const cancel = authMutation({
  role: ["admin", "maker"],
  args: { sessionId: v.id("workshopSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found.");
    await ctx.db.patch(args.sessionId, { status: "cancelled" });
  },
});

// ─── Delete a session (hard-delete, only if no registrations) ──────────────
export const remove = authMutation({
  role: ["admin", "maker"],
  args: { sessionId: v.id("workshopSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found.");
    if (session.usedUpSlots > 0) {
      throw new ConvexError(
        "Cannot delete a session that has registrations. Cancel it instead.",
      );
    }
    await ctx.db.delete(args.sessionId);
  },
});
