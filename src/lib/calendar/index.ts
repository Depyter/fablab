/**
 * Shared calendar domain layer.
 *
 * Owns canonical calendar types, business-hour constants, shared labels,
 * status helpers, booking-window normalization, and shared layout primitives.
 *
 * It intentionally does not own:
 * - visible-range state/navigation (`src/components/calendar/calendar-state.ts`)
 * - day/week/month presentation components (`usage-table`, `calendar-range-view`)
 * - Convex data loading (`convex/calendar/query.ts`)
 *
 * Canonical dependencies that remain outside this module:
 * - `src/lib/lab-time.ts` for lab-time conversions
 * - `src/lib/time-range.ts` for overlap/clipping primitives
 * - `convex/constants.ts` for project status values
 * - `src/lib/project-status-styles.ts` for project badge styling
 */

export * from "./constants";
export * from "./labels";
export * from "./layout";
export * from "./status";
export * from "./types";
export * from "./view-models";
export * from "./windows";
