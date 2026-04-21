"use client";

import { useState } from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import { InventoryTab } from "@/components/inventory/tabs";
import { Button } from "@/components/ui/button";
import { AddRoomForm } from "@/components/inventory/forms/add-room-form";
import { AddToolForm } from "@/components/inventory/forms/add-tool-form";
import { AddMachineForm } from "@/components/inventory/forms/add-machine-form";
import { AddMiscForm } from "@/components/inventory/forms/add-misc-form";
import { MaterialForm } from "@/components/inventory/forms/material-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataViewRoot,
  DataViewToolbar,
  DataViewFilters,
} from "@/components/manage/data-view";

interface InventoryClientProps {
  preloadedResources: Preloaded<typeof api.resource.query.getResources>;
  preloadedMaterials: Preloaded<typeof api.materials.query.getMaterials>;
}

export function InventoryClient({
  preloadedResources,
  preloadedMaterials,
}: InventoryClientProps) {
  const resources = usePreloadedAuthQuery(preloadedResources) ?? [];
  const materials = usePreloadedAuthQuery(preloadedMaterials) ?? [];

  const [machineOpen, setMachineOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [miscOpen, setMiscOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name-az" | "status">("name-az");

  const filteredResources = (() => {
    let result = [...resources];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  })();

  const filteredMaterials = (() => {
    let result = [...materials];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  })();

  const totalItems = resources.length + materials.length;
  const filteredTotal = filteredResources.length + filteredMaterials.length;

  const activeFilterCount = [search.trim() !== "", sortBy !== "name-az"].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setSearch("");
    setSortBy("name-az");
  };

  return (
    <DataViewRoot>
      <DataViewToolbar
        title="Inventory"
        subtitle={
          filteredTotal === totalItems
            ? `${totalItems} item${totalItems === 1 ? "" : "s"}`
            : `${filteredTotal} of ${totalItems} items`
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setMachineOpen(true)}>
                Add Machine
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setToolOpen(true)}>
                Add Tool
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRoomOpen(true)}>
                Add Room
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMiscOpen(true)}>
                Add Misc Item
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMaterialOpen(true)}>
                Add Material
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <DataViewFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search inventory…"
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
      >
        <Select
          value={sortBy}
          onValueChange={(v: "name-az" | "status") => setSortBy(v)}
        >
          <SelectTrigger className="h-7 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
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
      </DataViewFilters>

      {/* Inventory uses a custom tabbed layout instead of the standard DataViewContent grid */}
      <InventoryTab
        items={filteredResources ?? []}
        materials={filteredMaterials ?? []}
      />

      {/* Dialogs rendered outside DropdownMenu to prevent unmounting/hydration issues */}
      <Dialog open={machineOpen} onOpenChange={setMachineOpen}>
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddMachineForm onSuccess={() => setMachineOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={toolOpen} onOpenChange={setToolOpen}>
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddToolForm onSuccess={() => setToolOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddRoomForm onSuccess={() => setRoomOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={miscOpen} onOpenChange={setMiscOpen}>
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddMiscForm onSuccess={() => setMiscOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <MaterialForm onSuccess={() => setMaterialOpen(false)} />
        </DialogContent>
      </Dialog>
    </DataViewRoot>
  );
}
