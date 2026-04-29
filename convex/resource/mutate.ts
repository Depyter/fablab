import { v, ConvexError } from "convex/values";
import {
  authMutation,
  checkAuthority,
  claimFiles,
  deleteFiles,
} from "../helper";
import {
  scheduleProjectUpdateEmail,
  sendProjectSystemMessage,
  syncProjectTotalInvoice,
} from "../projects/helper";

export const addResource = authMutation({
  role: ["admin", "maker"],
  args: {
    name: v.string(),
    category: v.union(
      v.literal("room"),
      v.literal("machine"),
      v.literal("tool"),
      v.literal("misc"),
    ),
    type: v.string(),
    images: v.array(v.id("_storage")),
    description: v.string(),
    status: v.union(
      v.literal("Unavailable"),
      v.literal("Available"),
      v.literal("Under Maintenance"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("resources", {
      name: args.name,
      category: args.category,
      type: args.type,
      images: args.images,
      description: args.description,
      status: args.status,
    });

    claimFiles(ctx, args.images);
  },
});

export const updateResource = authMutation({
  role: ["admin", "maker"],
  args: {
    id: v.id("resources"),
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("Unavailable"),
        v.literal("Available"),
        v.literal("Under Maintenance"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const updates: Partial<{
      name: string;
      type: string;
      description: string;
      status: "Unavailable" | "Available" | "Under Maintenance";
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteResource = authMutation({
  role: ["admin", "maker"],
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) throw new ConvexError("Resource not found!");

    if (resource.images) {
      await deleteFiles(ctx, resource.images);
    }

    await ctx.db.delete(args.id);
  },
});

export const addImageToResource = authMutation({
  role: ["admin", "maker"],
  args: {
    resource: v.id("resources"),
    image: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resource);

    if (!resource) throw new ConvexError("Resource does not exist!");

    await ctx.db.patch(args.resource, {
      images: [...resource.images, args.image],
    });

    claimFiles(ctx, [args.image]);
  },
});

export const deleteImageFromResource = authMutation({
  role: ["admin", "maker"],
  args: {
    resource: v.id("resources"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resource);

    if (!resource) throw new ConvexError("Resource does not exist!");
    const updatedList = resource.images.filter((id) => id !== args.image);

    await ctx.db.patch(args.resource, {
      images: updatedList,
    });

    deleteFiles(ctx, [args.image]);
  },
});

export const updateUsage = authMutation({
  args: {
    id: v.id("resourceUsage"),
    resource: v.optional(v.id("resources")),
    service: v.optional(v.id("services")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db.get(args.id);
    if (!usage) throw new Error("Usage not found!");

    const project = await ctx.db.get(usage.projectId);
    const isOwner = project?.userId === ctx.profile._id;

    const isPrivileged = await checkAuthority(
      ["admin", "maker"],
      ctx.user,
      ctx,
    );

    if (!isOwner && !isPrivileged) {
      throw new ConvexError("Unauthorized. Cannot update resource.");
    }

    if (!isPrivileged && args.resource !== undefined) {
      throw new ConvexError("Unauthorized. Cannot modify restricted fields.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    const lines: string[] = [];

    if (args.resource !== undefined && args.resource !== usage.resource) {
      updates.resource = args.resource;
      const resource = await ctx.db.get(args.resource);
      lines.push(
        `Resource usage updated:`,
        `- Resource: **${resource?.name ?? "Unknown"}**`,
      );
    }
    if (args.service !== undefined && args.service !== usage.service) {
      updates.service = args.service;
      const service = await ctx.db.get(args.service);
      if (lines.length === 0) {
        lines.push(`Resource usage updated:`);
      }
      lines.push(`- Service: **${service?.name ?? "Unknown"}**`);
    }
    if (args.startTime !== undefined && args.startTime !== usage.startTime) {
      updates.startTime = args.startTime;
    }
    if (args.endTime !== undefined && args.endTime !== usage.endTime) {
      updates.endTime = args.endTime;
    }

    if (updates.startTime !== undefined || updates.endTime !== undefined) {
      const nextStartTime = updates.startTime ?? usage.startTime;
      const nextEndTime = updates.endTime ?? usage.endTime;
      const bookingDate = new Date(nextStartTime).toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const startTime = new Date(nextStartTime).toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(nextEndTime).toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (lines.length === 0) {
        lines.push(`Booking updated:`);
      }
      lines.push(
        `- Schedule: ${bookingDate} from ${startTime} to ${endTime} (PST)`,
      );
    }

    if (Object.keys(updates).length === 0) return;

    await ctx.db.patch(args.id, updates);
    await syncProjectTotalInvoice(ctx, usage.projectId);
    await scheduleProjectUpdateEmail(ctx, usage.projectId);
    await sendProjectSystemMessage(ctx, usage.projectId, lines);
  },
});

export const deleteUsage = authMutation({
  role: ["admin", "maker"],
  args: {
    usage: v.id("resourceUsage"),
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db.get(args.usage);
    if (!usage) throw new ConvexError("Usage not found!");

    await ctx.db.delete(args.usage);
    await syncProjectTotalInvoice(ctx, usage.projectId);
  },
});
