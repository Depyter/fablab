import { ConvexError, v } from "convex/values";
import { authMutation, authQuery } from "./helper";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./constants";

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
    const metadata = await ctx.storage.getMetadata(args.upload);

    if (!metadata) {
      throw new ConvexError(
        "Uploaded file could not be found in storage. Please try again.",
      );
    }

    if (metadata.size > MAX_FILE_SIZE_BYTES) {
      await ctx.storage.delete(args.upload);
      throw new ConvexError(
        `File exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      );
    }

    const contentType = metadata.contentType ?? "application/octet-stream";

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      await ctx.storage.delete(args.upload);
      throw new ConvexError(
        `File type "${contentType}" is not supported. Please upload an image, video, 3D model, or document.`,
      );
    }

    await ctx.db.insert("files", {
      originalName: args.originalName,
      storageId: args.upload,
      type: contentType,
      status: "orphaned",
      uploadedBy: ctx.profile._id,
    });
  },
});

export const getUrl = authQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();

    if (!file) throw new ConvexError("File not found.");

    // If uploadedBy is set, only the original uploader may fetch the URL.
    if (file.uploadedBy && file.uploadedBy !== ctx.profile._id) {
      throw new ConvexError("Unauthorized: You did not upload this file.");
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});
