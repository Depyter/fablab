import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { authQuery, authMutation, claimFiles } from "./helper";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import { UserRole } from "./constants";
import { authComponent, createAuth } from "./auth";

export const listUserProfiles = authQuery({
  role: ["admin"],
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let paginatedProfiles;
    if (args.search) {
      paginatedProfiles = await ctx.db
        .query("userProfile")
        .withSearchIndex("search_email", (q) => q.search("email", args.search!))
        .paginate(args.paginationOpts);
    } else {
      paginatedProfiles = await ctx.db
        .query("userProfile")
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Enhance profiles with ban status from better-auth
    const pageWithBanStatus = await Promise.all(
      paginatedProfiles.page.map(async (profile) => {
        const betterUser = await authComponent.getAnyUserById(
          ctx,
          profile.userId,
        );

        return {
          ...profile,
          banned: betterUser?.banned ?? false,
          banReason: betterUser?.banReason ?? null,
          banExpires: betterUser?.banExpires ?? null,
        };
      }),
    );

    return {
      ...paginatedProfiles,
      page: pageWithBanStatus,
    };
  },
});

export const updateUserRole = authMutation({
  role: ["admin"],
  args: {
    id: v.id("userProfile"),
    role: v.union(
      v.literal(UserRole.ADMIN),
      v.literal(UserRole.MAKER),
      v.literal(UserRole.CLIENT),
    ),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) throw new ConvexError("User profile not found");

    await ctx.db.patch(args.id, { role: args.role });
  },
});

export const getUserProfile = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!profile) return null;

    const betterUser = await authComponent.getAnyUserById(ctx, profile.userId);

    return {
      ...profile,
      profilePicUrl: profile.profilePic
        ? await ctx.storage.getUrl(profile.profilePic)
        : null,
      banned: betterUser?.banned ?? false,
      banReason: betterUser?.banReason ?? null,
      banExpires: betterUser?.banExpires ?? null,
    };
  },
});

export const updateProfile = authMutation({
  args: {
    name: v.optional(v.string()),
    profilePic: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const updates: { name?: string; profilePic?: Id<"_storage"> } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.profilePic !== undefined) {
      updates.profilePic = args.profilePic;
      await claimFiles(ctx, [args.profilePic]);
    }

    await ctx.db.patch(ctx.profile._id, updates);
  },
});

export const getRole = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user.subject))
      .first();

    if (!profile) throw new ConvexError("User profile not found");

    return profile.role;
  },
});

export const createUserProfile = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userProfile", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      role: "client",
    });
  },
});

export const createAdmin = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userProfile", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      role: "admin",
    });
  },
});

export const createMaker = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userProfile", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      role: "maker",
    });
  },
});

export const getMakers = authQuery({
  role: ["admin", "maker"],
  args: {},
  handler: async (ctx) => {
    const makers = await ctx.db
      .query("userProfile")
      .withIndex("by_role", (q) => q.eq("role", "maker"))
      .collect();

    return Promise.all(
      makers.map(async (maker) => ({
        ...maker,
        profilePicUrl: maker.profilePic
          ? await ctx.storage.getUrl(maker.profilePic)
          : null,
      })),
    );
  },
});

export const banUser = authMutation({
  role: ["admin"],
  args: {
    userId: v.string(),
    banReason: v.optional(v.string()),
    banExpiresIn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.adminUpdateUser({
      body: {
        userId: args.userId,
        data: {
          banned: true,
          banReason: args.banReason ?? "No reason provided",
          ...(args.banExpiresIn
            ? { banExpires: new Date(Date.now() + args.banExpiresIn * 1000) }
            : {}),
        },
      },
      headers,
    });
  },
});

export const unbanUser = authMutation({
  role: ["admin"],
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.adminUpdateUser({
      body: {
        userId: args.userId,
        data: {
          banned: false,
          banReason: null,
          banExpires: null,
        },
      },
      headers,
    });
  },
});
