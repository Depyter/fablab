import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Initialize a project
export const createProject = mutation({
  args: {
    pricing: v.union(
      v.literal("normal"),
      v.literal("UP"),
      v.literal("Special"),
    ),
    files: v.optional(v.array(v.string())),
    service: v.id("services"),
    specialInstructions: v.string(),
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
    await ctx.db.insert("projects", {
      alias: defaultAlias,
      userId: userProfile._id,
      service: args.service,
      pricing: args.pricing,
      status: "pending",
      files: args.files,
      specialInstructions: args.specialInstructions,
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
    await ctx.db.insert("messages", {
      room: room,
      content: `Generated room for project: ${defaultAlias}`,
      sender: "System",
    });
  },
});
