"use client";

import * as React from "react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ManageFilterClear,
  ManageFilterSearch,
} from "@/components/manage/manage-primitives";
import {
  getProjectsView,
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import { cn } from "@/lib/utils";
import {
  ViewHeader,
  ViewHeaderMain,
  ViewHeaderRow,
} from "@/components/ui/view-header";
import {
  CalendarNavigation,
  CalendarTabSwitcher,
  CalendarViewSwitcher,
} from "@/components/calendar/booking-calendar-toolbar";
import {
  BookingCalendarProvider,
  useBookingCalendarController,
} from "@/components/calendar/use-booking-calendar-controller";

// ---------------------------------------------------------------------------
// Constants & Icons
// ---------------------------------------------------------------------------

const PROJECT_VIEWS = ["gallery", "list"] as const;
type ProjectViewMode = (typeof PROJECT_VIEWS)[number];

const VIEW_ICONS: Record<ProjectViewMode, React.ReactNode> = {
  gallery: <LayoutGrid className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
};

const VIEW_LABELS: Record<ProjectViewMode, string> = {
  gallery: "Gallery View",
  list: "List View",
};

// ---------------------------------------------------------------------------
// Action Components
// ---------------------------------------------------------------------------

function DataViewViewToggle() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const view = getProjectsView(searchParams);

  return (
    <div className="flex items-center border rounded-md h-8 shrink-0 bg-background">
      {PROJECT_VIEWS.map((nextView, index) => (
        <Button
          key={nextView}
          variant="ghost"
          size="sm"
          title={VIEW_LABELS[nextView]}
          onClick={() =>
            replaceParams({
              view: nextView === "gallery" ? null : nextView,
            })
          }
          className={cn(
            "h-8 w-8 rounded-none px-0",
            index < PROJECT_VIEWS.length - 1 && "border-r",
            view === nextView && "bg-muted text-foreground",
          )}
        >
          {VIEW_ICONS[nextView]}
        </Button>
      ))}
    </div>
  );
}

export function DataViewToolbarActions() {
  const { section, replaceParams } = useDataViewRouteState();
  if (!section) return null;

  if (section === "projects") {
    return (
      <div className="flex items-center gap-2">
        <DataViewViewToggle />
        <Button size="sm" className="h-8 gap-1 shrink-0" asChild>
          <Link href="/services">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Project</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (section === "services") {
    return (
      <Button size="sm" className="h-8 gap-1 shrink-0" asChild>
        <Link href="/dashboard/services/add-service">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Service</span>
        </Link>
      </Button>
    );
  }

  if (section === "calendar" || section === "users") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => replaceParams({ dialog: "machine" })}>
          Add Machine
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => replaceParams({ dialog: "tool" })}>
          Add Tool
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => replaceParams({ dialog: "room" })}>
          Add Room
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => replaceParams({ dialog: "misc" })}>
          Add Misc Item
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => replaceParams({ dialog: "material" })}
        >
          Add Material
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Filter Components
// ---------------------------------------------------------------------------

function CalendarControls() {
  const controller = useBookingCalendarController();

  return (
    <ViewHeaderMain>
      <CalendarNavigation
        date={controller.date}
        visibleRange={controller.visibleRange}
        onSelectDate={controller.setDate}
        onPrevPeriod={controller.handlePrevPeriod}
        onNextPeriod={controller.handleNextPeriod}
        onReset={controller.handleReset}
        className="rounded-md border bg-background p-0.5"
      />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <CalendarViewSwitcher
          viewMode={controller.viewMode}
          onViewModeChange={controller.setViewMode}
        />
        {controller.isAdminOrMaker ? (
          <CalendarTabSwitcher
            activeTab={controller.activeTab}
            onTabChange={controller.setActiveTab}
          />
        ) : null}
      </div>
    </ViewHeaderMain>
  );
}

export function DataViewControls() {
  const { section, pathname, searchParams, replaceParams } =
    useDataViewRouteState();
  const search = getSearchParam(searchParams, "search");

  if (!section) return null;

  if (section === "calendar") {
    return <CalendarControls />;
  }

  if (section === "projects") {
    const status = getSearchParam(searchParams, "status", "all");
    const date = getSearchParam(searchParams, "date", "all");
    const sort = getSearchParam(searchParams, "sort", "newest");
    const activeFilterCount = [
      search.trim() !== "",
      status !== "all",
      date !== "all",
      sort !== "newest",
    ].filter(Boolean).length;

    return (
      <ViewHeaderMain>
        <DataViewSearchField
          key={`${pathname}:${search}`}
          search={search}
          placeholder="Search projects…"
        />
        <div className="hidden items-center gap-2 sm:flex">
          <Select
            value={status}
            onValueChange={(value) =>
              replaceParams({ status: value === "all" ? null : value })
            }
          >
            <SelectTrigger className="h-8 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All statuses
              </SelectItem>
              <SelectItem value="pending" className="text-xs">
                Review
              </SelectItem>
              <SelectItem value="approved" className="text-xs">
                Fabrication
              </SelectItem>
              <SelectItem value="completed" className="text-xs">
                Payment
              </SelectItem>
              <SelectItem value="paid" className="text-xs">
                Claim
              </SelectItem>
              <SelectItem value="rejected" className="text-xs">
                Rejected
              </SelectItem>
              <SelectItem value="cancelled" className="text-xs">
                Cancelled
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={date}
            onValueChange={(value) =>
              replaceParams({ date: value === "all" ? null : value })
            }
          >
            <SelectTrigger className="h-8 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All dates
              </SelectItem>
              <SelectItem value="today" className="text-xs">
                Today
              </SelectItem>
              <SelectItem value="week" className="text-xs">
                This week
              </SelectItem>
              <SelectItem value="month" className="text-xs">
                This month
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) =>
              replaceParams({ sort: value === "newest" ? null : value })
            }
          >
            <SelectTrigger className="h-8 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-xs">
                Newest first
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Oldest first
              </SelectItem>
              <SelectItem value="price-high" className="text-xs">
                Price: high → low
              </SelectItem>
              <SelectItem value="price-low" className="text-xs">
                Price: low → high
              </SelectItem>
              <SelectItem value="name-az" className="text-xs">
                Name A → Z
              </SelectItem>
            </SelectContent>
          </Select>
          <ManageFilterClear
            activeCount={activeFilterCount}
            onClear={() =>
              replaceParams({
                search: null,
                status: null,
                date: null,
                sort: null,
              })
            }
          />
        </div>
      </ViewHeaderMain>
    );
  }

  if (section === "services") {
    const sort = getSearchParam(searchParams, "sort", "name-az");
    const activeFilterCount = [search.trim() !== "", sort !== "name-az"].filter(
      Boolean,
    ).length;

    return (
      <ViewHeaderMain>
        <DataViewSearchField
          key={`${pathname}:${search}`}
          search={search}
          placeholder="Search services…"
        />
        <div className="hidden items-center gap-2 sm:flex">
          <Select
            value={sort}
            onValueChange={(value) =>
              replaceParams({ sort: value === "name-az" ? null : value })
            }
          >
            <SelectTrigger className="h-8 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-az" className="text-xs">
                Name A → Z
              </SelectItem>
              <SelectItem value="price-high" className="text-xs">
                Price: high → low
              </SelectItem>
              <SelectItem value="price-low" className="text-xs">
                Price: low → high
              </SelectItem>
            </SelectContent>
          </Select>
          <ManageFilterClear
            activeCount={activeFilterCount}
            onClear={() => replaceParams({ search: null, sort: null })}
          />
        </div>
      </ViewHeaderMain>
    );
  }

  if (section === "users") {
    const activeFilterCount = search.trim() !== "" ? 1 : 0;

    return (
      <ViewHeaderMain>
        <DataViewSearchField
          key={`${pathname}:${search}`}
          search={search}
          placeholder="Search users by email…"
        />
        <ManageFilterClear
          activeCount={activeFilterCount}
          onClear={() => replaceParams({ search: null })}
        />
      </ViewHeaderMain>
    );
  }

  const sort = getSearchParam(searchParams, "sort", "name-az");
  const activeFilterCount = [search.trim() !== "", sort !== "name-az"].filter(
    Boolean,
  ).length;

  return (
    <ViewHeaderMain>
      <DataViewSearchField
        key={`${pathname}:${search}`}
        search={search}
        placeholder="Search inventory…"
      />
      <div className="hidden items-center gap-2 sm:flex">
        <Select
          value={sort}
          onValueChange={(value) =>
            replaceParams({ sort: value === "name-az" ? null : value })
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-az" className="text-xs">
              Name A → Z
            </SelectItem>
            <SelectItem value="status" className="text-xs">
              Status
            </SelectItem>
          </SelectContent>
        </Select>
        <ManageFilterClear
          activeCount={activeFilterCount}
          onClear={() => replaceParams({ search: null, sort: null })}
        />
      </div>
    </ViewHeaderMain>
  );
}

function DataViewSearchField({
  search,
  placeholder,
}: {
  search: string;
  placeholder: string;
}) {
  const { replaceParams } = useDataViewRouteState();
  const [searchDraft, setSearchDraft] = React.useState(search);
  const debouncedSearch = useDebounce(searchDraft, 250);

  React.useEffect(() => {
    if (debouncedSearch === search) return;
    replaceParams({ search: debouncedSearch || null });
  }, [debouncedSearch, replaceParams, search]);

  return (
    <ManageFilterSearch
      value={searchDraft}
      onChange={setSearchDraft}
      placeholder={placeholder}
      onClear={() => setSearchDraft("")}
      className="max-w-xs"
    />
  );
}

// ---------------------------------------------------------------------------
// Shell Component
// ---------------------------------------------------------------------------

export function DataViewShell({ children }: { children: React.ReactNode }) {
  const { section } = useDataViewRouteState();
  const content = (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <ViewHeader>
        <ViewHeaderRow>
          <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-primary transition-colors shrink-0" />
          <div className="mx-1 h-4 w-px bg-sidebar-border/60 shrink-0" />
          <DataViewControls />
          <div className="flex-1" />
          <DataViewToolbarActions />
        </ViewHeaderRow>
      </ViewHeader>

      <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );

  if (section === "calendar") {
    return <BookingCalendarProvider>{content}</BookingCalendarProvider>;
  }

  return content;
}
