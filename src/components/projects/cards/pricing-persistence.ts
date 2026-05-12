import { Id } from "@convex/_generated/dataModel";
import {
  type UsageDraft,
  type ResourceUsage,
  type UsagePreview,
  nearlyEqual,
  sameStringSet,
  toMaterialAmountMap,
  buildBookingRange,
  isPastBookingRange,
} from "./usage-item";

/** Minimum allowed duration for a usage booking (1 hour). */
export const MIN_USAGE_DURATION_MS = 60 * 60 * 1000;

/**
 * Validates every draft has a valid booking range (non-null dates/times, end
 * strictly after start). Returns either a Map of booking payloads keyed by
 * draft key, or an error message.
 */
export function validateUsageBookingPayloads(drafts: UsageDraft[]):
  | {
      valid: true;
      bookingPayloads: Map<
        string,
        {
          startTime: number;
          endTime: number;
          resourceId: Id<"resources"> | null;
        }
      >;
    }
  | { valid: false; error: string } {
  const bookingPayloads = new Map<
    string,
    {
      startTime: number;
      endTime: number;
      resourceId: Id<"resources"> | null;
    }
  >();

  for (const draft of drafts) {
    const bookingRange = buildBookingRange(
      draft.date,
      draft.startTime,
      draft.endTime,
    );

    if (!bookingRange) {
      return {
        valid: false,
        error: "Please enter a valid booking date and time for every usage.",
      };
    }

    if (bookingRange.endTime <= bookingRange.startTime) {
      return {
        valid: false,
        error: "Every usage must end after it starts.",
      };
    }

    bookingPayloads.set(draft.key, {
      startTime: bookingRange.startTime,
      endTime: bookingRange.endTime,
      resourceId: draft.resourceId
        ? (draft.resourceId as Id<"resources">)
        : null,
    });
  }

  return { valid: true, bookingPayloads };
}

/**
 * Returns `true` when any usage booking or the optional headline booking has a
 * start time that lies in the past.
 */
export function hasPastBooking(params: {
  bookingPayloads: Map<string, { startTime: number }>;
  usageDraftsLength: number;
  headlineBookingStartTime?: number | null;
}): boolean {
  const hasPastUsageBooking = Array.from(params.bookingPayloads.values()).some(
    ({ startTime }) => isPastBookingRange(startTime),
  );

  const hasPastHeadlineBooking =
    params.usageDraftsLength === 0 &&
    params.headlineBookingStartTime != null &&
    isPastBookingRange(params.headlineBookingStartTime);

  return hasPastUsageBooking || hasPastHeadlineBooking;
}

/**
 * Collects the set of usage IDs present across drafts that should be retained
 * (drafts whose `usageId` field is non-empty).
 */
export function extractRetainedUsageIds(drafts: UsageDraft[]): Set<string> {
  return new Set(
    drafts
      .map((draft) => draft.usageId)
      .filter((usageId): usageId is string => !!usageId),
  );
}

/**
 * Determines whether the pricing snapshot stored on an existing usage needs to
 * be updated based on differences between the original usage, the current
 * draft values, and the computed preview.
 */
export function shouldUpdatePricingSnapshot(params: {
  draft: UsageDraft;
  originalUsage?: ResourceUsage;
  preview: UsagePreview;
  isBuyFromLab: boolean;
}): boolean {
  const { draft, originalUsage, preview, isBuyFromLab } = params;

  const originalMaterialMap = toMaterialAmountMap(originalUsage?.materialsUsed);
  const originalMaterialIdsForUsage = (originalUsage?.materialsUsed ?? []).map(
    (materialEntry: { materialId: string }) => materialEntry.materialId,
  );
  const draftMaterialIds = Object.keys(draft.materialAmounts).sort();

  return (
    !originalUsage ||
    !originalUsage.pricingSnapshot ||
    !nearlyEqual(
      originalUsage.pricingSnapshot.setupFeePortion,
      draft.setupFeePortion,
    ) ||
    !nearlyEqual(originalUsage.pricingSnapshot.rate, draft.rate) ||
    !nearlyEqual(originalUsage.pricingSnapshot.duration, preview.duration) ||
    !nearlyEqual(originalUsage.pricingSnapshot.timeCost, preview.timeCost) ||
    !nearlyEqual(
      originalUsage.pricingSnapshot.materialCost,
      preview.materialCost,
    ) ||
    originalUsage.pricingSnapshot.unitName !== draft.unitName ||
    (isBuyFromLab &&
      (!sameStringSet(draftMaterialIds, originalMaterialIdsForUsage) ||
        draftMaterialIds.some(
          (materialId) =>
            (draft.materialAmounts[materialId] ?? 0) !==
            (originalMaterialMap[materialId] ?? 0),
        )))
  );
}

/**
 * Builds the array of material entries to sync to the backend for a given
 * draft. Returns `undefined` when the pricing type does not track materials
 * (i.e. not a "buy from lab" scenario).
 */
export function buildSyncMaterials(
  draft: UsageDraft,
  isBuyFromLab: boolean,
): Array<{ materialId: Id<"materials">; amountUsed: number }> | undefined {
  if (!isBuyFromLab) return undefined;

  return Object.keys(draft.materialAmounts)
    .sort()
    .map((materialId) => ({
      materialId: materialId as Id<"materials">,
      amountUsed: draft.materialAmounts[materialId] ?? 0,
    }));
}
