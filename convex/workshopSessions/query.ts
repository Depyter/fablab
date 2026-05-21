import { v } from "convex/values";
import { authQuery } from "../helper";

// ─── List sessions for a specific workshop service ─────────────────────────
// Ordered by startTime ascending. Only active sessions by default.
export const listByService = authQuery({
  role: ["admin", "maker", "client"],
  args: {
    serviceId: v.id("services"),
    includeCancelled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("workshopSessions")
      .withIndex("by_serviceId_startTime", (q) =>
        q.eq("serviceId", args.serviceId),
      );

    const sessions = await query.collect();

    if (!args.includeCancelled) {
      return sessions.filter((s) => s.status !== "cancelled");
    }
    return sessions;
  },
});

// ─── Get a single session by ID ────────────────────────────────────────────
export const get = authQuery({
  role: ["admin", "maker", "client"],
  args: { sessionId: v.id("workshopSessions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.sessionId);
  },
});

// ─── List upcoming active sessions across ALL workshops ────────────────────
// Used for the "Upcoming" tab in the workshops page.
// Returns sessions with their parent workshop service name attached.
export const listUpcoming = authQuery({
  role: ["admin", "maker", "client"],
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit ?? 50;

    const sessions = await ctx.db
      .query("workshopSessions")
      .withIndex("by_startTime", (q) => q.gte("startTime", now))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .order("asc")
      .take(limit);

    // Attach service names
    const serviceIds = new Set(sessions.map((s) => s.serviceId));
    const serviceDocs = await Promise.all(
      Array.from(serviceIds).map((id) => ctx.db.get(id)),
    );
    const serviceMap = new Map(
      serviceDocs
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => [d._id, d]),
    );

    return sessions.map((session) => {
      const service = serviceMap.get(session.serviceId);
      return {
        ...session,
        serviceName: service?.name ?? "Unknown Workshop",
        serviceSlug: service?.slug ?? "",
      };
    });
  },
});

// ─── List past sessions across all workshops ───────────────────────────────
export const listPast = authQuery({
  role: ["admin", "maker", "client"],
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit ?? 50;

    const sessions = await ctx.db
      .query("workshopSessions")
      .withIndex("by_startTime", (q) => q.lt("startTime", now))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .order("desc")
      .take(limit);

    const serviceIds = new Set(sessions.map((s) => s.serviceId));
    const serviceDocs = await Promise.all(
      Array.from(serviceIds).map((id) => ctx.db.get(id)),
    );
    const serviceMap = new Map(
      serviceDocs
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => [d._id, d]),
    );

    return sessions.map((session) => {
      const service = serviceMap.get(session.serviceId);
      return {
        ...session,
        serviceName: service?.name ?? "Unknown Workshop",
        serviceSlug: service?.slug ?? "",
      };
    });
  },
});
