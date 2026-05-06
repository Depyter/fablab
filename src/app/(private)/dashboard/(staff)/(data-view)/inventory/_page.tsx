"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { InventoryClient } from "./_client";

function InventoryFilterControls() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const sort = getSearchParam(searchParams, "sort", "name-az");
  const activeFilterCount = [sort !== "name-az"].filter(Boolean).length;

  return (
    <DataViewFilterPanel
      activeCount={activeFilterCount}
      title="Inventory filters"
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
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilterField>
    </DataViewFilterPanel>
  );
}

function InventoryAddButton() {
  const { replaceParams } = useDataViewRouteState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 shrink-0 gap-1">
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

function InventoryPageHeader() {
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
          placeholder="Search inventory…"
          className="max-w-sm"
        />
        <div className="flex shrink-0 items-center gap-2">
          <InventoryFilterControls />
          <InventoryAddButton />
        </div>
      </ViewHeaderMain>
    </DataViewPageHeader>
  );
}

export function InventoryPageContent() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <InventoryPageHeader />
      <InventoryClient />
    </div>
  );
}
