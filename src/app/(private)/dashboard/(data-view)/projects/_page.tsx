"use client";

import * as React from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { SelectItem } from "@/components/ui/select";
import {
  getProjectsView,
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import { UserRole } from "@convex/constants";
import { useProfile } from "@/components/sidebar/profile-context";
import { ProjectsListClient } from "./_client";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import {
  GridBackground,
  BrandSelect,
  BrandFilterPanel,
  BrandButton,
  BrandSearchField,
  BrandSegmentedControl,
} from "@/components/brand/primitives";

const VIEW_OPTIONS = [
  { value: "gallery" as const, icon: <LayoutGrid className="size-4" /> },
  { value: "list" as const, icon: <List className="size-4" /> },
];

function ProjectsViewToggle() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const view = getProjectsView(searchParams);

  return (
    <BrandSegmentedControl
      options={VIEW_OPTIONS}
      value={view}
      onChange={(nextView) =>
        replaceParams({ view: nextView === "gallery" ? null : nextView })
      }
    />
  );
}

function ProjectsFilterBar() {
  const { searchParams, replaceParams, pathname } = useDataViewRouteState();
  const profile = useProfile();
  const status = getSearchParam(searchParams, "status", "all");
  const date = getSearchParam(searchParams, "date", "all");
  const sort = getSearchParam(searchParams, "sort", "newest");
  const search = getSearchParam(searchParams, "search");
  const assignedToMe = getSearchParam(searchParams, "assignedToMe") === "true";
  const view = getProjectsView(searchParams);
  const activeFilterCount = [
    status !== "all",
    date !== "all",
    sort !== "newest",
    assignedToMe,
  ].filter(Boolean).length;

  return (
    <>
      <BrandSearchField
        value={search}
        onChange={(value) => replaceParams({ search: value ? value : null })}
        placeholder="Search projects…"
        remountKey={`${pathname}:${search}`}
      />

      <BrandFilterPanel
        title="Project filters"
        activeCount={activeFilterCount}
        onClear={() =>
          replaceParams({
            status: null,
            date: null,
            sort: null,
            assignedToMe: null,
          })
        }
      >
        <BrandSelect
          value={status}
          onValueChange={(value) =>
            replaceParams({ status: value === "all" ? null : value })
          }
          placeholder="Status"
        >
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Review</SelectItem>
          <SelectItem value="approved">Fabrication</SelectItem>
          <SelectItem value="completed">Payment</SelectItem>
          <SelectItem value="paid">Claim</SelectItem>
          <SelectItem value="claimed">Claimed</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </BrandSelect>

        <BrandSelect
          value={date}
          onValueChange={(value) =>
            replaceParams({ date: value === "all" ? null : value })
          }
          placeholder="Date"
        >
          <SelectItem value="all">All dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="month">This month</SelectItem>
        </BrandSelect>

        <BrandSelect
          value={sort}
          onValueChange={(value) =>
            replaceParams({ sort: value === "newest" ? null : value })
          }
          placeholder="Sort"
        >
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="price-high">Price: high → low</SelectItem>
          <SelectItem value="price-low">Price: low → high</SelectItem>
          <SelectItem value="name-az">Name A → Z</SelectItem>
        </BrandSelect>

        {profile?.role === UserRole.MAKER && (
          <BrandSelect
            value={assignedToMe ? "true" : "false"}
            onValueChange={(value) =>
              replaceParams({ assignedToMe: value === "true" ? "true" : null })
            }
            placeholder="Assignee"
          >
            <SelectItem value="false">Everyone</SelectItem>
            <SelectItem value="true">Assigned to me</SelectItem>
          </BrandSelect>
        )}
      </BrandFilterPanel>

      {/* View toggle */}
      <ProjectsViewToggle />

      {/* Add project */}
      <BrandButton href="/services" className="bg-fab-magenta text-white">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Project</span>
      </BrandButton>
    </>
  );
}

export function ProjectsPage() {
  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <GridBackground opacity="opacity-15" />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        <DataViewPageHeader>
          <ProjectsFilterBar />
        </DataViewPageHeader>
        <ProjectsListClient />
      </div>
    </div>
  );
}
