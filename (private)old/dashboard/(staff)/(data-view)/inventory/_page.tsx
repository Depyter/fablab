"use client";

import { Plus, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SelectItem } from "@/components/ui/select";
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
import { InventoryClient } from "./_client";

function InventoryAddButton() {
  const { replaceParams } = useDataViewRouteState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <BrandButton className="bg-fab-magenta text-white">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Item</span>
          <ChevronDown className="size-3" strokeWidth={4} />
        </BrandButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-2 border-black shadow-[4px_4px_0_0_#000]"
      >
        <DropdownMenuItem
          className="text-[10px] font-black uppercase tracking-wider"
          onSelect={() => replaceParams({ dialog: "machine" })}
        >
          Add Machine
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[10px] font-black uppercase tracking-wider"
          onSelect={() => replaceParams({ dialog: "tool" })}
        >
          Add Tool
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[10px] font-black uppercase tracking-wider"
          onSelect={() => replaceParams({ dialog: "room" })}
        >
          Add Room
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[10px] font-black uppercase tracking-wider"
          onSelect={() => replaceParams({ dialog: "misc" })}
        >
          Add Misc Item
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[10px] font-black uppercase tracking-wider"
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
  const sort = getSearchParam(searchParams, "sort", "name-az");
  const search = getSearchParam(searchParams, "search");
  const activeFilterCount = [sort !== "name-az"].filter(Boolean).length;

  return (
    <DataViewPageHeader hideBorder>
      <BrandSearchField
        value={search}
        onChange={(value) => replaceParams({ search: value ? value : null })}
        placeholder="Search inventory…"
        remountKey={`${pathname}:${search}`}
      />

      <BrandFilterPanel
        title="Inventory filters"
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
          <SelectItem value="status">Status</SelectItem>
        </BrandSelect>
      </BrandFilterPanel>

      <InventoryAddButton />
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
