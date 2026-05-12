import { afterEach, describe, expect, test } from "vitest";

import {
  getBetterAuthTrustedOrigins,
  getProductionAuthUrl,
  PRODUCTION_AUTH_URL,
} from "../src/lib/auth-env";

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
const originalTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;

afterEach(() => {
  if (originalBetterAuthUrl === undefined) {
    delete process.env.BETTER_AUTH_URL;
  } else {
    process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
  }

  if (originalTrustedOrigins === undefined) {
    delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  } else {
    process.env.BETTER_AUTH_TRUSTED_ORIGINS = originalTrustedOrigins;
  }
});

describe("auth env helpers", () => {
  test("falls back to the production auth URL", () => {
    delete process.env.BETTER_AUTH_URL;

    expect(getProductionAuthUrl()).toBe(PRODUCTION_AUTH_URL);
  });

  test("builds trusted origins for local, production, current site, and configured previews", () => {
    process.env.BETTER_AUTH_URL = "https://fablab.harleyvan.com";
    process.env.BETTER_AUTH_TRUSTED_ORIGINS =
      "https://staging.fablab.harleyvan.com, https://fablab-preview.example.workers.dev";

    expect(
      getBetterAuthTrustedOrigins("https://preview.fablab.harleyvan.com"),
    ).toEqual([
      "http://localhost:3000",
      "https://fablab.harleyvan.com",
      "https://preview.fablab.harleyvan.com",
      "https://staging.fablab.harleyvan.com",
      "https://fablab-preview.example.workers.dev",
    ]);
  });
});
