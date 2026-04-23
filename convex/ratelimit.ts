import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

const RATE_LIMITS = {
  // 30 messages/min per user, bursts of up to 10 extra
  sendMessage: {
    kind: "token bucket" as const,
    rate: 30,
    period: MINUTE,
    capacity: 10,
  },
  // 30 upload URL requests/min per user, bursts of up to 10 extra
  uploadFiles: {
    kind: "token bucket" as const,
    rate: 60,
    period: MINUTE,
    capacity: 10,
  },
  // 5 project bookings/min per user (fixed window — no burst allowance)
  createProject: { kind: "fixed window" as const, rate: 5, period: MINUTE },
};

export type RateLimitName = keyof typeof RATE_LIMITS;
export const rateLimiter = new RateLimiter(components.rateLimiter, RATE_LIMITS);
