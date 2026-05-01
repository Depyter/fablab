"use client";

import * as React from "react";
import { PackageOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ManageFilterSearch,
  ManageFilterClear,
  ManageGrid,
  ManageEmptyState,
} from "@/components/manage/manage-layout";

import { DataViewLoadingState } from "@/components/manage/data-view-loading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = "gallery" | "list" | "calendar";

function useResolvedView(explicitView?: ViewMode): ViewMode {
  return explicitView ?? "gallery";
}

// ---------------------------------------------------------------------------
// Content
// Smart content area that handles loading, empty-data, empty-filtered, and
// view-specific rendering via render props.
// ---------------------------------------------------------------------------

interface DataViewContentProps<T> {
  items: T[];
  totalItems: number;
  isLoading?: boolean;
  view?: ViewMode;
  /** Hide content in these view modes; use `viewSlots` for those views instead */
  hideInViews?: ViewMode[];
  /** Render slots for specific view modes, keyed by ViewMode */
  viewSlots?: Partial<Record<ViewMode, React.ReactNode>>;
  /** How to render each item in gallery mode */
  renderItem: (item: T) => React.ReactNode;
  /** Render each item in list mode (falls back to renderItem if omitted) */
  renderListItem?: (item: T) => React.ReactNode;
  /** Override the entire grid/list area for the current view */
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  filteredEmptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
  };
  gridClassName?: string;
  listClassName?: string;
}

export function DataViewContent<T extends { _id: string }>({
  items,
  totalItems,
  isLoading = false,
  view: explicitView,
  hideInViews,
  viewSlots,
  renderItem,
  renderListItem,
  emptyState,
  filteredEmptyState,
  gridClassName,
  listClassName,
}: DataViewContentProps<T>) {
  const view = useResolvedView(explicitView);

  if (isLoading) {
    return <DataViewLoadingState view={view} />;
  }

  // Hide in view (but no slot provided — caller handles it externally)
  if (hideInViews?.includes(view)) return null;

  // View-specific slot override (e.g. calendar)
  if (viewSlots?.[view]) {
    return <>{viewSlots[view]}</>;
  }

  // No data at all
  if (totalItems === 0) {
    return (
      <ManageEmptyState
        icon={emptyState?.icon ?? <PackageOpen className="size-12" />}
        title={emptyState?.title ?? "Nothing here yet"}
        description={
          emptyState?.description ?? "Add your first item to get started."
        }
        action={emptyState?.action}
      />
    );
  }

  // Data exists but filters returned nothing
  if (items.length === 0) {
    return (
      <ManageEmptyState
        icon={filteredEmptyState?.icon ?? <Search className="size-8" />}
        title={filteredEmptyState?.title ?? "No matching items"}
        description={
          filteredEmptyState?.description ?? "Try adjusting your filters."
        }
        action={filteredEmptyState?.action}
      />
    );
  }

  if (view === "list") {
    return (
      <div className={cn("p-4 sm:p-6 overflow-y-auto flex-1", listClassName)}>
        <div className="border rounded-lg divide-y bg-background overflow-hidden">
          {items.map((item) =>
            renderListItem ? renderListItem(item) : renderItem(item),
          )}
        </div>
      </div>
    );
  }

  // Gallery (default)
  return (
    <ManageGrid className={gridClassName}>
      {items.map((item) => renderItem(item))}
    </ManageGrid>
  );
}

// ---------------------------------------------------------------------------
// LoadMore
// Renders a centred "Load More" button; hidden in excluded views.
// ---------------------------------------------------------------------------

interface DataViewLoadMoreProps {
  canLoadMore: boolean;
  onLoadMore: () => void;
  label?: string;
  view?: ViewMode;
  hideInViews?: ViewMode[];
}

export function DataViewLoadMore({
  canLoadMore,
  onLoadMore,
  label = "Load More",
  view: explicitView,
  hideInViews,
}: DataViewLoadMoreProps) {
  const view = useResolvedView(explicitView);

  if (!canLoadMore) return null;
  if (hideInViews?.includes(view)) return null;

  return (
    <div className="flex justify-center p-6">
      <Button variant="outline" onClick={onLoadMore}>
        {label}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Convenience re-exports so consumers only need one import
// ---------------------------------------------------------------------------

export {
  ManageFilterSearch as DataViewSearch,
  ManageFilterClear as DataViewFilterClear,
  ManageEmptyState as DataViewEmptyState,
  ManageGrid as DataViewGrid,
};
