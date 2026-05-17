"use client";

import Link from "next/link";
import { SelectItem } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import {
  BrandSelect,
  BrandFilterPanel,
  BrandButton,
  BrandSearchField,
} from "@/components/brand/primitives";
import { ServicesListClient } from "./_client";

function ServicesPageHeader() {
  const { pathname, searchParams, replaceParams } = useDataViewRouteState();
  const sort = getSearchParam(searchParams, "sort", "name-az");
  const search = getSearchParam(searchParams, "search");
  const activeFilterCount = [sort !== "name-az"].filter(Boolean).length;

  return (
    <DataViewPageHeader>
      <BrandSearchField
        value={search}
        onChange={(value) => replaceParams({ search: value ? value : null })}
        placeholder="Search services…"
        remountKey={`${pathname}:${search}`}
      />

      <BrandFilterPanel
        title="Service filters"
        activeCount={activeFilterCount}
        onClear={() => replaceParams({ sort: null })}
      >
        <BrandSelect
          value={sort}
          onValueChange={(value) =>
            replaceParams({ sort: value === "name-az" ? null : value })
          }
          placeholder="Sort"
        >
          <SelectItem value="name-az">Name A → Z</SelectItem>
          <SelectItem value="price-high">Price: high → low</SelectItem>
          <SelectItem value="price-low">Price: low → high</SelectItem>
        </BrandSelect>
      </BrandFilterPanel>

      <BrandButton
        href="/dashboard/services/add-service"
        className="bg-fab-magenta text-white"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Service</span>
      </BrandButton>
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
