export const PRODUCTION_AUTH_URL = "https://fablab.harleyvan.com";

const splitCsv = (value?: string) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

export const getProductionAuthUrl = () => {
  return process.env.BETTER_AUTH_URL?.trim() || PRODUCTION_AUTH_URL;
};

export const getBetterAuthTrustedOrigins = (siteUrl?: string) => {
  return [
    ...new Set([
      "http://localhost:3000",
      getProductionAuthUrl(),
      ...(siteUrl ? [siteUrl.trim()] : []),
      ...splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    ]),
  ];
};
