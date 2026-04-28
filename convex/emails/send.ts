import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";

const isResendTestMode =
  typeof process !== "undefined" && process.env.RESEND_TEST_MODE === "true";

export const resend: Resend = new Resend(components.resend, {
  testMode: isResendTestMode,
  ...(isResendTestMode
    ? { apiKey: process.env.RESEND_API_KEY ?? "test-api-key" }
    : {}),
});
