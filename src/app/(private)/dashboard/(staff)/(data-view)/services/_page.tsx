"use client";

import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewHeaderMain } from "@/components/ui/view-header";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import {
  DataViewFilterField,
  DataViewFilterPanel,
  DataViewSearchField,
} from "@/components/manage/data-view-toolbar";
import { ServicesListClient } from "./_client";

function ServicesFilterControls() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const sort = getSearchParam(searchParams, "sort", "name-az");
  const activeFilterCount = [sort !== "name-az"].filter(Boolean).length;

  return (
    <DataViewFilterPanel
      activeCount={activeFilterCount}
      title="Service filters"
      onClear={() => replaceParams({ sort: null })}
    >
      <DataViewFilterField label="Sort">
        <Select
          value={sort}
          onValueChange={(value) =>
            replaceParams({ sort: value === "name-az" ? null : value })
          }
        >
          <SelectTrigger className="h-9 w-full bg-background text-sm shadow-none">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-az">Name A → Z</SelectItem>
            <SelectItem value="price-high">Price: high → low</SelectItem>
            <SelectItem value="price-low">Price: low → high</SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilterField>
    </DataViewFilterPanel>
  );
}

function ServicesPageHeader() {
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
          placeholder="Search services…"
          className="max-w-sm"
        />
        <div className="flex shrink-0 items-center gap-2">
          <ServicesFilterControls />
          <Button size="sm" className="h-8 shrink-0 gap-1" asChild>
            <Link href="/dashboard/services/add-service">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Service</span>
            </Link>
          </Button>
        </div>
      </ViewHeaderMain>
    </DataViewPageHeader>
  );
}

export function ServicesPageContent() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <ServicesPageHeader />
      <ServicesListClient />
    </div>
  );
}
