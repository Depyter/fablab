import { ConvexError, v } from "convex/values";
import { authMutation, authQuery } from "./helper";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  FileStatus,
} from "./constants";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// The file size is not limited, but upload POST request has a 2 minute timeout.
export const generateUploadUrl = authMutation({
  args: {},
  rateLimit: "uploadFiles",
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
  rateLimit: "uploadFiles",
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

    const fileId = await ctx.db.insert("files", {
      originalName: args.originalName,
      storageId: args.upload,
      type: contentType,
      status: "orphaned",
      uploadedBy: ctx.profile._id,
    });

    // Schedule async moderation check immediately after insert.
    // Only schedule when OPENAI_API_KEY is configured — in test environments
    // the scheduler would fail and leak unhandled rejections in convex-test.
    if (process.env.OPENAI_API_KEY) {
      await ctx.scheduler.runAfter(0, internal.files.moderateFileUpload, {
        fileId,
      });
    }
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

    // Block access to files flagged by moderation.
    if (file.status === FileStatus.FLAGGED) {
      throw new ConvexError(
        "This file was removed for violating content policies.",
      );
    }

    // If uploadedBy is set, only the original uploader may fetch the URL.
    if (file.uploadedBy && file.uploadedBy !== ctx.profile._id) {
      throw new ConvexError("Unauthorized: You did not upload this file.");
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});

// ---------------------------------------------------------------------------
// Internal queries for the moderation pipeline
// ---------------------------------------------------------------------------

export const getFileInternal = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

/** Look up a file record by its storage ID (used by chat moderation pipeline). */
export const getFileByStorageId = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
  },
});

/** Lightweight status-only query consumed by the frontend subscription.
 * Public (not internal) so the frontend can poll it for moderation results. */
export const getFileStatus = authQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();

    if (!file) return null;

    return {
      status: file.status,
      moderationCategory: file.moderationCategory,
      fileName: file.originalName,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal action — background moderation of a newly uploaded file
// ---------------------------------------------------------------------------

export const moderateFileUpload = internalAction({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.runQuery(internal.files.getFileInternal, {
      fileId: args.fileId,
    });
    if (!file) return;

    const payload: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: file.originalName }];

    // If the file is an image, send its public URL to the omni model.
    if (file.type.startsWith("image/")) {
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (fileUrl) {
        payload.push({
          type: "image_url",
          image_url: { url: fileUrl },
        });
      }
    }

    const result = await ctx.runAction(internal.moderation.moderateContent, {
      items: payload,
    });

    await ctx.runMutation(internal.moderation.handleFileModerationResult, {
      fileId: args.fileId,
      flagged: result.flagged,
      categories: result.categories,
    });
  },
});
