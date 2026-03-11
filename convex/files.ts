import { v } from "convex/values";
import { mutation } from "./_generated/server";

// The file size is not limited, but upload POST request has a 2 minute timeout.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No identity!");

    return await ctx.storage.generateUploadUrl();
  },
});

export const trackUpload = mutation({
  args: {
    upload: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pendingFiles", {
      storageId: args.upload,
    });
  },
});
