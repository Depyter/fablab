import { v } from "convex/values";
import { authMutation } from "./helper";

// The file size is not limited, but upload POST request has a 2 minute timeout.
export const generateUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const trackUpload = authMutation({
  args: {
    originalName: v.string(),
    upload: v.id("_storage"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("files", {
      originalName: args.originalName,
      storageId: args.upload,
      type: args.type,
      status: "orphaned",
    });
  },
});
