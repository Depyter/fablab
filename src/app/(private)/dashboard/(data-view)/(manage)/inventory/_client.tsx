"use client";

import * as React from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { Preloaded } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import { InventoryTab } from "@/components/inventory/tabs";
import { AddRoomForm } from "@/components/inventory/forms/add-room-form";
import { AddToolForm } from "@/components/inventory/forms/add-tool-form";
import { AddMachineForm } from "@/components/inventory/forms/add-machine-form";
import { AddMiscForm } from "@/components/inventory/forms/add-misc-form";
import { MaterialForm } from "@/components/inventory/forms/material-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InventoryDataViewLoadingState } from "@/components/manage/data-view-loading";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";

interface InventoryClientProps {
  preloadedResources: Preloaded<typeof api.resource.query.getResources>;
  preloadedMaterials: Preloaded<typeof api.materials.query.getMaterials>;
}

type InventoryDialog = "machine" | "tool" | "room" | "misc" | "material";
type InventorySort = "name-az" | "status";

const SORT_OPTIONS: InventorySort[] = ["name-az", "status"];
const DIALOG_OPTIONS: InventoryDialog[] = [
  "machine",
  "tool",
  "room",
  "misc",
  "material",
];

export function InventoryClient({
  preloadedResources,
  preloadedMaterials,
}: InventoryClientProps) {
  const { replaceParams } = useDataViewRouteState();
  const searchParams = useSearchParams();
  const resourcesQuery = usePreloadedAuthQuery(preloadedResources);
  const materialsQuery = usePreloadedAuthQuery(preloadedMaterials);
  const resources = React.useMemo(() => resourcesQuery ?? [], [resourcesQuery]);
  const materials = React.useMemo(() => materialsQuery ?? [], [materialsQuery]);
  const search = getSearchParam(searchParams, "search");
  const sortRaw = getSearchParam(searchParams, "sort", "name-az");
  const dialogRaw = searchParams.get("dialog");

  const sortBy: InventorySort = SORT_OPTIONS.includes(sortRaw as InventorySort)
    ? (sortRaw as InventorySort)
    : "name-az";
  const activeDialog: InventoryDialog | null = DIALOG_OPTIONS.includes(
    dialogRaw as InventoryDialog,
  )
    ? (dialogRaw as InventoryDialog)
    : null;
  const isLoading =
    resourcesQuery === undefined || materialsQuery === undefined;

  const filteredResources = React.useMemo(() => {
    let result = [...resources];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (resource) =>
          resource.name.toLowerCase().includes(q) ||
          resource.description.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  }, [resources, search, sortBy]);

  const filteredMaterials = React.useMemo(() => {
    let result = [...materials];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (material) =>
          material.name.toLowerCase().includes(q) ||
          material.category.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  }, [materials, search, sortBy]);

  if (isLoading) {
    return <InventoryDataViewLoadingState />;
  }

  const setDialogOpen = (dialog: InventoryDialog, open: boolean) => {
    replaceParams({ dialog: open ? dialog : null });
  };

  return (
    <>
      <InventoryTab items={filteredResources} materials={filteredMaterials} />

      <Dialog
        open={activeDialog === "machine"}
        onOpenChange={(open) => setDialogOpen("machine", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddMachineForm onSuccess={() => replaceParams({ dialog: null })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "tool"}
        onOpenChange={(open) => setDialogOpen("tool", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddToolForm onSuccess={() => replaceParams({ dialog: null })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "room"}
        onOpenChange={(open) => setDialogOpen("room", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddRoomForm onSuccess={() => replaceParams({ dialog: null })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "misc"}
        onOpenChange={(open) => setDialogOpen("misc", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <AddMiscForm onSuccess={() => replaceParams({ dialog: null })} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "material"}
        onOpenChange={(open) => setDialogOpen("material", open)}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <MaterialForm onSuccess={() => replaceParams({ dialog: null })} />
        </DialogContent>
      </Dialog>
    </>
  );
}
