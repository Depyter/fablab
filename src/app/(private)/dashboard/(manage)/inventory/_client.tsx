"use client";

import { useReducer } from "react";
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

type InventoryDialog = "machine" | "tool" | "room" | "misc" | "material";
type InventorySort = "name-az" | "status";

interface InventoryClientState {
  activeDialog: InventoryDialog | null;
  search: string;
  sortBy: InventorySort;
}

type InventoryClientAction =
  | { type: "openDialog"; dialog: InventoryDialog }
  | { type: "closeDialog" }
  | { type: "setSearch"; search: string }
  | { type: "setSortBy"; sortBy: InventorySort }
  | { type: "clearFilters" };

const INITIAL_STATE: InventoryClientState = {
  activeDialog: null,
  search: "",
  sortBy: "name-az",
};

function inventoryClientReducer(
  state: InventoryClientState,
  action: InventoryClientAction,
): InventoryClientState {
  switch (action.type) {
    case "openDialog":
      return { ...state, activeDialog: action.dialog };
    case "closeDialog":
      return { ...state, activeDialog: null };
    case "setSearch":
      return { ...state, search: action.search };
    case "setSortBy":
      return { ...state, sortBy: action.sortBy };
    case "clearFilters":
      return { ...state, search: "", sortBy: "name-az" };
    default:
      return state;
  }
}

export function InventoryClient({
  preloadedResources,
  preloadedMaterials,
}: InventoryClientProps) {
  const resources = usePreloadedAuthQuery(preloadedResources) ?? [];
  const materials = usePreloadedAuthQuery(preloadedMaterials) ?? [];
  const [state, dispatch] = useReducer(inventoryClientReducer, INITIAL_STATE);

  const filteredResources = (() => {
    let result = [...resources];

    if (state.search.trim()) {
      const q = state.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (state.sortBy === "name-az") return a.name.localeCompare(b.name);
      if (state.sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  })();

  const filteredMaterials = (() => {
    let result = [...materials];

    if (state.search.trim()) {
      const q = state.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (state.sortBy === "name-az") return a.name.localeCompare(b.name);
      if (state.sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  })();

  const totalItems = resources.length + materials.length;
  const filteredTotal = filteredResources.length + filteredMaterials.length;

  const activeFilterCount = [
    state.search.trim() !== "",
    state.sortBy !== "name-az",
  ].filter(Boolean).length;

  const setDialogOpen = (dialog: InventoryDialog, open: boolean) => {
    dispatch(open ? { type: "openDialog", dialog } : { type: "closeDialog" });
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
              <DropdownMenuItem
                onSelect={() =>
                  dispatch({ type: "openDialog", dialog: "machine" })
                }
              >
                Add Machine
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  dispatch({ type: "openDialog", dialog: "tool" })
                }
              >
                Add Tool
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  dispatch({ type: "openDialog", dialog: "room" })
                }
              >
                Add Room
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  dispatch({ type: "openDialog", dialog: "misc" })
                }
              >
                Add Misc Item
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  dispatch({ type: "openDialog", dialog: "material" })
                }
              >
                Add Material
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <DataViewFilters
        search={state.search}
        onSearchChange={(search) => dispatch({ type: "setSearch", search })}
        searchPlaceholder="Search inventory…"
        activeFilterCount={activeFilterCount}
        onClearFilters={() => dispatch({ type: "clearFilters" })}
      >
        <Select
          value={state.sortBy}
          onValueChange={(sortBy: InventorySort) =>
            dispatch({ type: "setSortBy", sortBy })
          }
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
      <Dialog
        open={state.activeDialog === "machine"}
        onOpenChange={(open) => setDialogOpen("machine", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddMachineForm onSuccess={() => dispatch({ type: "closeDialog" })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={state.activeDialog === "tool"}
        onOpenChange={(open) => setDialogOpen("tool", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddToolForm onSuccess={() => dispatch({ type: "closeDialog" })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={state.activeDialog === "room"}
        onOpenChange={(open) => setDialogOpen("room", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddRoomForm onSuccess={() => dispatch({ type: "closeDialog" })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={state.activeDialog === "misc"}
        onOpenChange={(open) => setDialogOpen("misc", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddMiscForm onSuccess={() => dispatch({ type: "closeDialog" })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={state.activeDialog === "material"}
        onOpenChange={(open) => setDialogOpen("material", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <MaterialForm onSuccess={() => dispatch({ type: "closeDialog" })} />
        </DialogContent>
      </Dialog>
    </DataViewRoot>
  );
}
