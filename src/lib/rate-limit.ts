import { isRateLimitError } from "@convex-dev/rate-limiter";

/**
 * Returns a user-friendly error message if the error is a rate-limit rejection,
 * or `null` if the error is something else.
 *
 * The `@convex-dev/rate-limiter` package (with `throws: true`) rejects with a
 * ConvexError whose `.data` is `{ kind: "RateLimited", name, retryAfter }`.
 */
export function getRateLimitErrorMessage(error: unknown): string | null {
  if (isRateLimitError(error)) {
    const seconds = Math.ceil(error.data.retryAfter / 1000);
    return `Too many requests. Please wait ${seconds}s before trying again.`;
  }
  return null;
}
