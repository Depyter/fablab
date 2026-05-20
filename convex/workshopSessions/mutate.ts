import { v, ConvexError } from "convex/values";
import { authMutation } from "../helper";

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
