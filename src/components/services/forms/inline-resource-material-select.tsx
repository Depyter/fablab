"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Plus } from "lucide-react";
import { MultipleSelectForm } from "@/components/services/forms/multiple-select-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InventoryItemForm,
  type InventoryItemType,
} from "@/components/inventory/forms/inventory-item-form";
import { MaterialForm } from "@/components/inventory/forms/material-form";

// ── Resource type picker cards ──────────────────────────────────────────

const RESOURCE_TYPE_OPTIONS: Array<{
  type: InventoryItemType;
  label: string;
  desc: string;
}> = [
  {
    type: "machine",
    label: "Machine",
    desc: "3D printers, CNC, laser cutters",
  },
  { type: "tool", label: "Tool", desc: "Power tools, hand tools, measurement" },
  { type: "room", label: "Room", desc: "Workshop areas, meeting rooms" },
  { type: "misc", label: "Misc", desc: "General items, consumables" },
];

type InlineSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  title?: string;
  placeholder?: string;
};

// ── Inline Resource Select ──────────────────────────────────────────────

export function InlineResourceSelect({
  value,
  onChange,
  title = "Resources",
  placeholder = "Select resources…",
}: InlineSelectProps) {
  const resources = useQuery(api.resource.query.getResources) ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resourceType, setResourceType] = useState<InventoryItemType | null>(
    null,
  );

  const options = resources.map((r) => ({ label: r.name, value: r._id }));

  return (
    <>
      <MultipleSelectForm
        options={options}
        title={title}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onAddNew={() => setDialogOpen(true)}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setResourceType(null);
        }}
      >
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          {resourceType === null ? (
            <div className="p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase tracking-tighter">
                  Add Resource
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                Choose a resource type:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {RESOURCE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setResourceType(opt.type)}
                    className="flex flex-col gap-1 border-2 border-black bg-white p-4 text-left shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-tighter">
                      <Plus className="h-3.5 w-3.5" />
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <InventoryItemForm
              itemType={resourceType}
              mode="add"
              onSuccess={() => {
                setDialogOpen(false);
                setResourceType(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Inline Material Select ──────────────────────────────────────────────

export function InlineMaterialSelect({
  value,
  onChange,
  title = "Allowed Materials",
  placeholder = "Select materials…",
}: InlineSelectProps) {
  const materials = useQuery(api.materials.query.getMaterials) ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);

  const options = materials.map((m) => ({ label: m.name, value: m._id }));

  return (
    <>
      <MultipleSelectForm
        options={options}
        title={title}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onAddNew={() => setDialogOpen(true)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
          showCloseButton={false}
        >
          <MaterialForm mode="add" onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
