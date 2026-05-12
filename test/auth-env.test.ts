import { afterEach, describe, expect, test } from "vitest";

import {
  assertDynamicBetterAuthBaseUrlConfig,
  getBetterAuthTrustedOrigins,
  getProductionAuthUrl,
  PRODUCTION_AUTH_URL,
} from "../src/lib/auth-env";

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
const originalBetterAuthProductionUrl = process.env.BETTER_AUTH_PRODUCTION_URL;
const originalTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;

afterEach(() => {
  if (originalBetterAuthUrl === undefined) {
    delete process.env.BETTER_AUTH_URL;
  } else {
    process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
  }

  if (originalBetterAuthProductionUrl === undefined) {
    delete process.env.BETTER_AUTH_PRODUCTION_URL;
  } else {
    process.env.BETTER_AUTH_PRODUCTION_URL = originalBetterAuthProductionUrl;
  }

  if (originalTrustedOrigins === undefined) {
    delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  } else {
    process.env.BETTER_AUTH_TRUSTED_ORIGINS = originalTrustedOrigins;
  }
});

describe("auth env helpers", () => {
  test("falls back to the production auth URL", () => {
    delete process.env.BETTER_AUTH_PRODUCTION_URL;

    expect(getProductionAuthUrl()).toBe(PRODUCTION_AUTH_URL);
  });

  test("builds trusted origins for local, production, and configured previews", () => {
    process.env.BETTER_AUTH_PRODUCTION_URL = "https://fablab.harleyvan.com";
    process.env.BETTER_AUTH_TRUSTED_ORIGINS =
      "*.preview.harleyvan.com, *-fablab-preview.example.workers.dev";

    expect(getBetterAuthTrustedOrigins()).toEqual([
      "http://localhost:*",
      "https://fablab.harleyvan.com",
      "*.preview.harleyvan.com",
      "*-fablab-preview.example.workers.dev",
    ]);
  });

  test("rejects legacy BETTER_AUTH_URL base URL config", () => {
    process.env.BETTER_AUTH_URL = "https://fablab.harleyvan.com";

    expect(() => assertDynamicBetterAuthBaseUrlConfig()).toThrow(
      /BETTER_AUTH_URL must be unset/,
    );
  });
});
