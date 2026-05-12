export const PRODUCTION_AUTH_URL = "https://fablab.harleyvan.com";

const splitCsv = (value?: string) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getProductionAuthUrl = () => {
  return process.env.BETTER_AUTH_PRODUCTION_URL?.trim() || PRODUCTION_AUTH_URL;
};

export const assertDynamicBetterAuthBaseUrlConfig = () => {
  if (process.env.BETTER_AUTH_URL?.trim()) {
    throw new Error(
      "BETTER_AUTH_URL must be unset for preview-safe Better Auth deployments. Use BETTER_AUTH_PRODUCTION_URL for OAuth proxy routing so Better Auth can infer the current preview origin from the request.",
    );
  }
};

export const getBetterAuthTrustedOrigins = () => {
  return [
    ...new Set([
      "http://localhost:*",
      trimTrailingSlash(getProductionAuthUrl()),
      ...splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS).map(
        trimTrailingSlash,
      ),
    ]),
  ];
};
