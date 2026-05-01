"use client";

import * as React from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import type { ViewMode } from "@/components/manage/data-view";

export type DataViewSection = "projects" | "services" | "inventory" | "users";

type SearchParamsLike = URLSearchParams | ReadonlyURLSearchParams;

export const DATA_VIEW_SECTION_CONFIG: Record<
  DataViewSection,
  { title: string; subtitle: string }
> = {
  projects: {
    title: "Your Projects",
    subtitle: "Track fabrication requests, schedules, and progress.",
  },
  services: {
    title: "Services",
    subtitle: "Manage the service catalogue and booking options.",
  },
  inventory: {
    title: "Inventory",
    subtitle: "Browse resources and materials from one shared workspace.",
  },
  users: {
    title: "User Management",
    subtitle: "Manage roles and access for all users.",
  },
};

export function getDataViewSection(pathname: string): DataViewSection | null {
  if (pathname.startsWith("/dashboard/projects")) return "projects";
  if (pathname.startsWith("/dashboard/services")) return "services";
  if (pathname.startsWith("/dashboard/inventory")) return "inventory";
  if (pathname.startsWith("/dashboard/users")) return "users";
  return null;
}

export function getProjectsView(searchParams: SearchParamsLike): ViewMode {
  const view = searchParams.get("view");
  return view === "calendar" || view === "list" ? view : "gallery";
}

export function getSearchParam(
  searchParams: SearchParamsLike,
  key: string,
  fallback = "",
) {
  return searchParams.get(key) ?? fallback;
}

export function useDataViewRouteState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = React.useMemo(() => getDataViewSection(pathname), [pathname]);

  const replaceParams = React.useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return { pathname, searchParams, section, replaceParams };
}
