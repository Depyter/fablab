"use client";

import * as React from "react";
import { Calendar, LayoutGrid, List, PackageOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ManageHeader,
  ManageFilterBar,
  ManageFilterSearch,
  ManageFilterClear,
  ManageGrid,
  ManageEmptyState,
} from "@/components/manage/manage-layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = "gallery" | "list" | "calendar";

export interface DataViewContextValue {
  view: ViewMode;
  setView: (v: ViewMode) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DataViewContext = React.createContext<DataViewContextValue | null>(null);

export function useDataView(): DataViewContextValue {
  const ctx = React.useContext(DataViewContext);
  if (!ctx) throw new Error("useDataView must be used inside <DataViewRoot>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Root
// Provides view-mode state to all child components via context.
// ---------------------------------------------------------------------------

interface DataViewRootProps {
  children: React.ReactNode;
  defaultView?: ViewMode;
}

export function DataViewRoot({
  children,
  defaultView = "gallery",
}: DataViewRootProps) {
  const [view, setView] = React.useState<ViewMode>(defaultView);

  return (
    <DataViewContext.Provider value={{ view, setView }}>
      {children}
    </DataViewContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// Wraps ManageHeader and provides an optional built-in view-mode toggle.
// `views` controls which toggle buttons appear. Omit the prop to hide the
// toggle entirely (e.g. inventory / services only have gallery view).
// ---------------------------------------------------------------------------

interface DataViewToolbarProps {
  title: string;
  subtitle?: string;
  /** Which view-mode buttons to show, in order. Omit to hide the toggle. */
  views?: ViewMode[];
  /** Slot for action buttons (Add, dropdowns, etc.) rendered after the toggle */
  actions?: React.ReactNode;
}

const VIEW_ICONS: Record<ViewMode, React.ReactNode> = {
  gallery: <LayoutGrid className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
};

const VIEW_LABELS: Record<ViewMode, string> = {
  gallery: "Gallery View",
  list: "List View",
  calendar: "Calendar View",
};

export function DataViewToolbar({
  title,
  subtitle,
  views,
  actions,
}: DataViewToolbarProps) {
  const { view, setView } = useDataView();

  return (
    <ManageHeader title={title} subtitle={subtitle}>
      {views && views.length > 0 && (
        <div className="flex items-center border rounded-md overflow-hidden h-8 shrink-0">
          {views.map((v, i) => (
            <Button
              key={v}
              variant="ghost"
              size="sm"
              title={VIEW_LABELS[v]}
              onClick={() => setView(v)}
              className={cn(
                "h-8 w-8 rounded-none px-0",
                i < views.length - 1 && "border-r",
                view === v && "bg-muted text-foreground",
              )}
            >
              {VIEW_ICONS[v]}
            </Button>
          ))}
        </div>
      )}
      {actions}
    </ManageHeader>
  );
}

// ---------------------------------------------------------------------------
// Filters
// Wraps ManageFilterBar with a built-in search input.
// Pass extra filter widgets (Selects, etc.) as children.
// Optionally hide when in a specific view (e.g. calendar).
// ---------------------------------------------------------------------------

interface DataViewFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  /** Hide the whole filter bar in these view modes */
  hideInViews?: ViewMode[];
  children?: React.ReactNode;
}

export function DataViewFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  activeFilterCount = 0,
  onClearFilters,
  hideInViews,
  children,
}: DataViewFiltersProps) {
  const { view } = useDataView();

  if (hideInViews?.includes(view)) return null;

  return (
    <ManageFilterBar>
      <ManageFilterSearch
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        onClear={() => onSearchChange("")}
      />
      {children}
      {onClearFilters && (
        <ManageFilterClear
          activeCount={activeFilterCount}
          onClear={onClearFilters}
        />
      )}
    </ManageFilterBar>
  );
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
  hideInViews,
  viewSlots,
  renderItem,
  renderListItem,
  emptyState,
  filteredEmptyState,
  gridClassName,
  listClassName,
}: DataViewContentProps<T>) {
  const { view } = useDataView();

  // View-specific slot override (e.g. calendar)
  if (viewSlots?.[view]) {
    return <>{viewSlots[view]}</>;
  }

  // Hide in view (but no slot provided — caller handles it externally)
  if (hideInViews?.includes(view)) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 flex-1 text-muted-foreground text-sm">
        Loading…
      </div>
    );
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
  hideInViews?: ViewMode[];
}

export function DataViewLoadMore({
  canLoadMore,
  onLoadMore,
  label = "Load More",
  hideInViews,
}: DataViewLoadMoreProps) {
  const { view } = useDataView();

  if (!canLoadMore) return null;
  if (hideInViews?.includes(view)) return null;

  return (
    <div className="flex justify-center p-6 shrink-0">
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
