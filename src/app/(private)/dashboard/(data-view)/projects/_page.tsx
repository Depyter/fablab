"use client";

import Link from "next/link";
import * as React from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewHeaderMain } from "@/components/ui/view-header";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import {
  getProjectsView,
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import {
  DataViewFilterField,
  DataViewFilterPanel,
  DataViewSearchField,
} from "@/components/manage/data-view-toolbar";
import { cn } from "@/lib/utils";
import { ProjectsListClient } from "./_client";

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

function ProjectsViewToggle() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const view = getProjectsView(searchParams);

  return (
    <div className="flex h-8 shrink-0 items-center rounded-md border bg-background">
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

function ProjectFilterControls() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const status = getSearchParam(searchParams, "status", "all");
  const date = getSearchParam(searchParams, "date", "all");
  const sort = getSearchParam(searchParams, "sort", "newest");
  const activeFilterCount = [
    status !== "all",
    date !== "all",
    sort !== "newest",
  ].filter(Boolean).length;

  return (
    <DataViewFilterPanel
      activeCount={activeFilterCount}
      title="Project filters"
      onClear={() =>
        replaceParams({
          status: null,
          date: null,
          sort: null,
        })
      }
    >
      <DataViewFilterField label="Status">
        <Select
          value={status}
          onValueChange={(value) =>
            replaceParams({ status: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="h-9 w-full bg-background text-sm shadow-none">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Review</SelectItem>
            <SelectItem value="approved">Fabrication</SelectItem>
            <SelectItem value="completed">Payment</SelectItem>
            <SelectItem value="paid">Claim</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilterField>
      <DataViewFilterField label="Date">
        <Select
          value={date}
          onValueChange={(value) =>
            replaceParams({ date: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="h-9 w-full bg-background text-sm shadow-none">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilterField>
      <DataViewFilterField label="Sort">
        <Select
          value={sort}
          onValueChange={(value) =>
            replaceParams({ sort: value === "newest" ? null : value })
          }
        >
          <SelectTrigger className="h-9 w-full bg-background text-sm shadow-none">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="price-high">Price: high → low</SelectItem>
            <SelectItem value="price-low">Price: low → high</SelectItem>
            <SelectItem value="name-az">Name A → Z</SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilterField>
    </DataViewFilterPanel>
  );
}

function ProjectsPageHeader() {
  const { pathname, searchParams, replaceParams } = useDataViewRouteState();
  const search = getSearchParam(searchParams, "search");

  return (
    <DataViewPageHeader>
      <ViewHeaderMain>
        <DataViewSearchField
          key={`${pathname}:${search}`}
          search={search}
          onSearchChange={(value) =>
            replaceParams({ search: value ? value : null })
          }
          placeholder="Search projects…"
          className="max-w-sm"
        />
        <div className="flex shrink-0 items-center gap-2">
          <ProjectFilterControls />
          <ProjectsViewToggle />
          <Button size="sm" className="h-8 shrink-0 gap-1" asChild>
            <Link href="/services">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Project</span>
            </Link>
          </Button>
        </div>
      </ViewHeaderMain>
    </DataViewPageHeader>
  );
}

export function ProjectsPage() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <ProjectsPageHeader />
      <ProjectsListClient />
    </div>
  );
}
