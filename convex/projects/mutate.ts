import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Initialize a project
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    serviceType: v.union(v.literal("self-service"), v.literal("full-service")),
    material: v.union(v.literal("provide-own"), v.literal("buy-from-lab")),
    service: v.id("services"),
    pricing: v.union(v.literal("normal"), v.literal("UP")),
    files: v.optional(v.array(v.string())),
    notes: v.string(),

    booking: v.object({
      startTime: v.number(),
      endTime: v.number(),
      date: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // assume user has already logged in
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.subject))
      .first();

    if (!userProfile) throw new Error("User not authorized");

    // get service name for alias
    const service = await ctx.db.get(args.service);
    if (!service) throw new Error("Service not found");

    // create default alias: [service name] - [user name]
    const defaultAlias = `${service.name} - ${userProfile.name}`;

    // create project
    const project = await ctx.db.insert("projects", {
      name: defaultAlias,
      description: args.description,
      serviceType: args.serviceType,
      material: args.material,
      userId: userProfile._id,
      service: args.service,
      pricing: args.pricing,
      status: "pending",
      resources: [],
      files: args.files,
      notes: args.notes,
    });

    // create proposed usage
    await ctx.db.insert("resourceUsage", {
      service: args.service,
      project: project,
      startTime: args.booking.startTime,
      endTime: args.booking.endTime,
      date: args.booking.date,
    });

    // create associated chat
    const room = await ctx.db.insert("rooms", {
      name: defaultAlias,
      color: "yellow",
    });

    // add the user as a chat member
    await ctx.db.insert("roomMembers", {
      roomId: room,
      participantId: userProfile._id,
    });

    const admins = await ctx.db
      .query("userProfile")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    // add all the admins to the chat
    for (const admin of admins) {
      await ctx.db.insert("roomMembers", {
        roomId: room,
        participantId: admin._id,
      });
    }

    // create initial system message
    const message = await ctx.db.insert("messages", {
      room: room,
      content: `Generated room for project: ${defaultAlias}`,
      sender: "System",
    });

    await ctx.db.patch("rooms", room, {
      lastMessageId: message,
    });

    return room;
  },
});
