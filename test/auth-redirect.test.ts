import { describe, expect, test } from "vitest";

import {
  buildCurrentPath,
  buildLoginHref,
  getSafeReturnTo,
} from "../src/lib/auth-redirect";

describe("auth redirect helpers", () => {
  test("keeps safe internal return paths", () => {
    expect(getSafeReturnTo("/services/laser?tab=quote#pricing")).toBe(
      "/services/laser?tab=quote#pricing",
    );
  });

  test("accepts same-origin absolute URLs when an origin is provided", () => {
    expect(
      getSafeReturnTo(
        "https://app.example/services/laser?tab=quote#pricing",
        "/dashboard/chat",
        "https://app.example",
      ),
    ).toBe("/services/laser?tab=quote#pricing");
  });

  test("rejects external and parser-bypass redirect targets", () => {
    expect(getSafeReturnTo("https://evil.example/phish")).toBe(
      "/dashboard/chat",
    );
    expect(getSafeReturnTo("//evil.example/phish")).toBe("/dashboard/chat");
    expect(getSafeReturnTo("/\\evil.example")).toBe("/dashboard/chat");
  });

  test("rejects redirects back to the login page", () => {
    expect(getSafeReturnTo("/login")).toBe("/dashboard/chat");
    expect(getSafeReturnTo("/login?redirectTo=%2Fservices")).toBe(
      "/dashboard/chat",
    );
  });

  test("strips nested redirectTo params when capturing the current path", () => {
    expect(
      buildCurrentPath("/services/laser", {
        toString: () => "redirectTo=%2Fdashboard%2Fchat&foo=1&bar=2",
      }),
    ).toBe("/services/laser?foo=1&bar=2");
  });

  test("builds a plain login href when the current page is already login", () => {
    expect(buildLoginHref("/login?redirectTo=%2Fservices")).toBe("/login");
  });
});
