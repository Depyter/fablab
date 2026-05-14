const DEFAULT_AUTH_REDIRECT = "/dashboard/chat";
const INTERNAL_RETURN_TO_ORIGIN = "https://fablab.local";

type SearchParamsLike = {
  toString(): string;
};

export function getSafeReturnTo(
  redirectTo: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
  origin = INTERNAL_RETURN_TO_ORIGIN,
) {
  if (!redirectTo) return fallback;

  let url: URL;
  try {
    url = new URL(redirectTo, origin);
  } catch {
    return fallback;
  }

  if (url.origin !== origin) {
    return fallback;
  }

  const returnTo = `${url.pathname}${url.search}${url.hash}`;
  if (
    returnTo === "/login" ||
    returnTo.startsWith("/login?") ||
    returnTo === "/signup" ||
    returnTo.startsWith("/signup?")
  ) {
    return fallback;
  }

  return returnTo;
}

export function buildCurrentPath(
  pathname: string,
  searchParams?: SearchParamsLike | null,
) {
  const currentSearchParams = new URLSearchParams(searchParams?.toString());
  currentSearchParams.delete("redirectTo");
  const search = currentSearchParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function buildLoginHref(redirectTo?: string | null) {
  const safeRedirect = getSafeReturnTo(redirectTo, "");
  if (!safeRedirect) return "/login";
  return `/login?redirectTo=${encodeURIComponent(safeRedirect)}`;
}
