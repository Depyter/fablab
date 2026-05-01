"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataViewSection, getProjectsView } from "./data-view-route-state";
import type { ViewMode } from "@/components/manage/data-view";

const gridSkeletonKeys = Array.from(
  { length: 8 },
  (_, slot) => `data-view-grid-skeleton-${slot}`,
);

const listSkeletonKeys = Array.from(
  { length: 10 },
  (_, slot) => `data-view-list-skeleton-${slot}`,
);

const inventoryTabSkeletonKeys = Array.from(
  { length: 5 },
  (_, slot) => `data-view-inventory-tab-skeleton-${slot}`,
);

function DataViewCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-2 h-8 w-full rounded-full" />
      </div>
    </div>
  );
}

function DataViewRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-10 w-14 rounded-md shrink-0" />
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Skeleton className="h-4 w-16 hidden md:block" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function DataViewGridLoadingState() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {gridSkeletonKeys.map((key) => (
          <DataViewCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

export function DataViewListLoadingState() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="border rounded-lg divide-y bg-background overflow-hidden">
        {listSkeletonKeys.map((key) => (
          <DataViewRowSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

export function InventoryDataViewLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 pt-2">
        <div className="flex flex-wrap gap-2 pb-2">
          {inventoryTabSkeletonKeys.map((key) => (
            <Skeleton key={key} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </div>
      <DataViewGridLoadingState />
    </div>
  );
}

export function DataViewLoadingState({ view = "gallery" }: { view?: ViewMode }) {
  if (view === "list") return <DataViewListLoadingState />;
  if (view === "calendar") {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }
  return <DataViewGridLoadingState />;
}

export function DataViewLoadingClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = getDataViewSection(pathname);

  if (section === "inventory") {
    return <InventoryDataViewLoadingState />;
  }

  const view = getProjectsView(searchParams);
  return <DataViewLoadingState view={view} />;
}
