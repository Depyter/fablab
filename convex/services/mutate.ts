import { internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import {
  authMutation,
  checkAuthority,
  claimFiles,
  deleteFiles,
  slugify,
} from "../helper";

// called when user discards current service
export const deleteOrphanedFiles = authMutation({
  role: ["admin", "maker"],
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    deleteFiles(ctx, args.storageIds);
  },
});

export const cleanOrphanedFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orphans = await ctx.db
      .query("files")
      .withIndex("status", (q) => q.eq("status", "orphaned"))
      .collect();
    await Promise.all(
      orphans.map(async (orphan) => {
        await ctx.storage.delete(orphan.storageId);
        await ctx.db.delete(orphan._id);
      }),
    );
  },
});

export const addService = authMutation({
  role: ["admin", "maker"],
  args: {
    name: v.string(),
    images: v.array(v.id("_storage")), // array of fileids in convex
    samples: v.array(v.id("_storage")),
    description: v.string(),
    requirements: v.array(v.string()),
    serviceCategory: v.union(
      v.object({
        type: v.literal("WORKSHOP"),
        schedules: v.array(
          v.object({
            date: v.number(),
            timeSlots: v.array(
              v.object({
                startTime: v.number(),
                endTime: v.number(),
                maxSlots: v.number(),
                usedUpSlots: v.optional(v.number()),
              }),
            ),
          }),
        ),
        amount: v.number(),
        variants: v.optional(
          v.array(v.object({ name: v.string(), amount: v.number() })),
        ),
      }),
      v.object({
        type: v.literal("FABRICATION"),
        availableDays: v.optional(v.array(v.number())),
        materials: v.optional(v.array(v.id("materials"))),
        setupFee: v.number(),
        unitName: v.union(
          v.literal("minute"),
          v.literal("hour"),
          v.literal("day"),
        ),
        timeRate: v.number(),
        variants: v.optional(
          v.array(
            v.object({
              name: v.string(),
              setupFee: v.number(),
              timeRate: v.number(),
            }),
          ),
        ),
      }),
    ),
    fileTypes: v.array(v.string()),
    resources: v.optional(v.array(v.id("resources"))),
    status: v.union(v.literal("Unavailable"), v.literal("Available")),
  },
  handler: async (ctx, args) => {
    const slug = slugify(args.name);
    const existing = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      throw new ConvexError(
        `A service with the slug "${slug}" already exists. Choose a different name.`,
      );
    }

    const finalServiceCategory = args.serviceCategory;
    if (finalServiceCategory.type === "WORKSHOP") {
      finalServiceCategory.schedules.forEach((schedule) => {
        schedule.timeSlots.forEach((slot) => {
          slot.usedUpSlots = 0;
        });
      });
    }

    await ctx.db.insert("services", {
      name: args.name,
      slug: slugify(args.name),
      images: args.images,
      description: args.description,
      serviceCategory: finalServiceCategory,
      fileTypes: args.fileTypes,
      resources: args.resources,
      status: args.status,
      requirements: args.requirements,
      samples: args.samples,
    });

    if (args.images.length > 0) claimFiles(ctx, args.images);
    if (args.samples.length > 0) claimFiles(ctx, args.samples);
  },
});

export const updateService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    name: v.optional(v.string()),
    serviceCategory: v.optional(
      v.union(
        v.object({
          type: v.literal("WORKSHOP"),
          schedules: v.array(
            v.object({
              date: v.number(),
              timeSlots: v.array(
                v.object({
                  startTime: v.number(),
                  endTime: v.number(),
                  maxSlots: v.number(),
                  usedUpSlots: v.optional(v.number()),
                }),
              ),
            }),
          ),
          amount: v.number(),
          variants: v.optional(
            v.array(v.object({ name: v.string(), amount: v.number() })),
          ),
        }),
        v.object({
          type: v.literal("FABRICATION"),
          availableDays: v.optional(v.array(v.number())),
          materials: v.optional(v.array(v.id("materials"))),
          setupFee: v.number(),
          unitName: v.union(
            v.literal("minute"),
            v.literal("hour"),
            v.literal("day"),
          ),
          timeRate: v.number(),
          variants: v.optional(
            v.array(
              v.object({
                name: v.string(),
                setupFee: v.number(),
                timeRate: v.number(),
              }),
            ),
          ),
        }),
      ),
    ),
    requirements: v.optional(v.array(v.string())),
    fileTypes: v.optional(v.array(v.string())),
    resources: v.optional(v.array(v.id("resources"))),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("Unavailable"), v.literal("Available")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("No identity!");

    const authorization = await checkAuthority(["admin", "maker"], user, ctx);
    if (!authorization)
      throw new ConvexError("Unauthorized. Cannot add service.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (args.name !== undefined) {
      const slug = slugify(args.name);
      const conflict = await ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (conflict && conflict._id !== args.service) {
        throw new ConvexError(
          `A service with the slug "${slug}" already exists. Choose a different name.`,
        );
      }
      updates.name = args.name;
      updates.slug = slug;
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.serviceCategory !== undefined) {
      if (args.serviceCategory.type === "WORKSHOP") {
        const existingService = await ctx.db.get(args.service);
        if (
          existingService &&
          existingService.serviceCategory.type === "WORKSHOP"
        ) {
          for (const incomingSchedule of args.serviceCategory.schedules) {
            const existingSchedule =
              existingService.serviceCategory.schedules.find(
                (s) => s.date === incomingSchedule.date,
              );
            if (existingSchedule) {
              for (const incomingSlot of incomingSchedule.timeSlots) {
                const existingSlot = existingSchedule.timeSlots.find(
                  (t) =>
                    t.startTime === incomingSlot.startTime &&
                    t.endTime === incomingSlot.endTime,
                );
                if (existingSlot) {
                  const usedUp = existingSlot.usedUpSlots || 0;
                  if (incomingSlot.maxSlots < usedUp) {
                    throw new ConvexError(
                      `Cannot reduce max slots below used up slots (${usedUp}) for schedule on ${new Date(
                        incomingSchedule.date,
                      ).toLocaleDateString()}`,
                    );
                  }
                  incomingSlot.usedUpSlots = usedUp;
                } else {
                  incomingSlot.usedUpSlots = 0;
                }
              }
            } else {
              for (const incomingSlot of incomingSchedule.timeSlots) {
                incomingSlot.usedUpSlots = 0;
              }
            }
          }
        } else {
          for (const incomingSchedule of args.serviceCategory.schedules) {
            for (const incomingSlot of incomingSchedule.timeSlots) {
              incomingSlot.usedUpSlots = 0;
            }
          }
        }
      }
      updates.serviceCategory = args.serviceCategory;
    }
    if (args.requirements !== undefined)
      updates.requirements = args.requirements;
    if (args.fileTypes !== undefined) updates.fileTypes = args.fileTypes;
    if (args.resources !== undefined) updates.resources = args.resources;

    await ctx.db.patch(args.service, updates);
  },
});

export const addImageToService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    image: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");

    await ctx.db.patch("services", args.service, {
      images: [...service.images, args.image],
    });

    claimFiles(ctx, [args.image]);
  },
});

export const addSampleToService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    sample: v.id("_storage"), // storageID
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");

    await ctx.db.patch("services", args.service, {
      samples: [...service.samples, args.sample],
    });

    claimFiles(ctx, [args.sample]);
  },
});

export const deleteService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service not found!");
    await deleteFiles(ctx, service.images);
    await deleteFiles(ctx, service.samples);
    await ctx.db.delete("services", args.service);
  },
});

export const deleteImageFromService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    image: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");
    const updatedList = service.images.filter((id) => id !== args.image);

    await ctx.db.patch("services", args.service, {
      images: updatedList,
    });

    deleteFiles(ctx, [args.image]);
  },
});

export const deleteSampleFromService = authMutation({
  role: ["admin", "maker"],
  args: {
    service: v.id("services"),
    sample: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.service);

    if (!service) throw new ConvexError("Service does not exist!");
    const updatedList = service.samples.filter((id) => id !== args.sample);

    await ctx.db.patch("services", args.service, {
      samples: updatedList,
    });

    deleteFiles(ctx, [args.sample]);
  },
});
