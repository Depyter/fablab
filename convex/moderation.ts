import { v } from "convex/values";
import { internalAction, internalMutation, action } from "./_generated/server";
import OpenAI from "openai";
import { MODERATION_CATEGORY_LABELS, FileStatus } from "./constants";

// ---------------------------------------------------------------------------
// OpenAI client — instantiated lazily so the module doesn't fail at import
// time when OPENAI_API_KEY is missing from the environment.
// ---------------------------------------------------------------------------

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single item to submit to the moderation API. */
export type ModerationInputItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ModerationResult {
  flagged: boolean;
  /** Human-readable comma-separated list of violated categories. */
  categories: string;
}

// ---------------------------------------------------------------------------
// Shared internal action — callable from any other internal function.
// ---------------------------------------------------------------------------

export const moderateContent = internalAction({
  args: {
    /** Text string(s) and/or image URLs to classify. */
    items: v.array(
      v.union(
        v.object({ type: v.literal("text"), text: v.string() }),
        v.object({
          type: v.literal("image_url"),
          image_url: v.object({ url: v.string() }),
        }),
      ),
    ),
  },
  handler: async (_ctx, args): Promise<ModerationResult> => {
    if (args.items.length === 0) {
      return { flagged: false, categories: "" };
    }

    try {
      const openai = getOpenAI();

      const response = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: args.items as OpenAI.ModerationCreateParams["input"],
      });

      const result = response.results[0];
      if (!result) {
        return { flagged: false, categories: "" };
      }

      if (!result.flagged) {
        return { flagged: false, categories: "" };
      }

      // Collect the names of every category that was flagged.
      const flaggedCategories: string[] = [];
      const cats = result.categories as unknown as Record<string, boolean>;
      for (const [key, val] of Object.entries(cats)) {
        if (val) {
          flaggedCategories.push(MODERATION_CATEGORY_LABELS[key] ?? key);
        }
      }

      return {
        flagged: true,
        categories: flaggedCategories.join(", "),
      };
    } catch (error) {
      console.error("OpenAI moderation request failed:", error);
      // Fail open — don't block uploads/messages when the API is down.
      return { flagged: false, categories: "" };
    }
  },
});

// ---------------------------------------------------------------------------
// Shared handler for file moderation results
// ---------------------------------------------------------------------------

export const handleFileModerationResult = internalMutation({
  args: {
    fileId: v.id("files"),
    flagged: v.boolean(),
    categories: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return;

    if (args.flagged) {
      // Purge the unsafe file from Convex Storage.
      await ctx.storage.delete(file.storageId);
      // Mark database record as flagged with metadata.
      await ctx.db.patch(args.fileId, {
        status: FileStatus.FLAGGED,
        moderationCategory: args.categories,
        moderatedAt: Date.now(),
      });
    } else {
      // Mark as clean so the frontend can differentiate "not yet
      // moderated" from "moderated and clean".
      await ctx.db.patch(args.fileId, {
        moderatedAt: Date.now(),
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Shared handler for message moderation results
// ---------------------------------------------------------------------------

export const handleMessageModerationResult = internalMutation({
  args: {
    messageId: v.id("messages"),
    flagged: v.boolean(),
    categories: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    if (args.flagged) {
      await ctx.db.patch(args.messageId, {
        moderationStatus: "flagged",
        moderationCategory: args.categories,
        content: "[This message was removed for violating content policies]",
        file: undefined, // Strip attachments from flagged messages.
      });
    } else {
      await ctx.db.patch(args.messageId, {
        moderationStatus: "clean",
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Pre-flight validation action — call from the frontend *before* creating
// a booking/project so flagged content is caught before any side effects.
// ---------------------------------------------------------------------------

export const validateBookingText = action({
  args: {
    name: v.string(),
    description: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args): Promise<ModerationResult> => {
    // If the API key isn't configured, allow everything through.
    if (!process.env.OPENAI_API_KEY) {
      return { flagged: false, categories: "" };
    }

    const items: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];

    if (args.name.trim()) items.push({ type: "text", text: args.name });
    if (args.description.trim())
      items.push({ type: "text", text: args.description });
    if (args.notes.trim()) items.push({ type: "text", text: args.notes });

    if (items.length === 0) return { flagged: false, categories: "" };

    try {
      const openai = getOpenAI();
      const response = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: items,
      });

      const result = response.results[0];
      if (!result || !result.flagged) {
        return { flagged: false, categories: "" };
      }

      const flaggedCategories: string[] = [];
      const cats = result.categories as unknown as Record<string, boolean>;
      for (const [key, val] of Object.entries(cats)) {
        if (val) {
          flaggedCategories.push(MODERATION_CATEGORY_LABELS[key] ?? key);
        }
      }

      return {
        flagged: true,
        categories: flaggedCategories.join(", "),
      };
    } catch (error) {
      console.error("Booking text validation failed:", error);
      // Fail open — don't block bookings when the API is down.
      return { flagged: false, categories: "" };
    }
  },
});
