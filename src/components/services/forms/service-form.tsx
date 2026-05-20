"use client";

import { useState, useEffect, createContext } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/action-dialog";
import Link from "next/link";
import { useAppForm } from "@/lib/form-context";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

import { GeneralInfoForm } from "@/components/services/forms/general-info-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { MultipleSelectForm } from "@/components/services/forms/multiple-select-form";
import { FormSection } from "@/components/ui/form-section";
import { FileUpload } from "@/components/file-upload";
import type { UploadedFile } from "@/components/file-upload/types";
import { AddServiceFormValues } from "@/types/add-service";
import { ServiceStatus, FILE_CATEGORIES } from "@convex/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryItemForm, type InventoryItemType } from "@/components/inventory/forms/inventory-item-form";
import { MaterialForm } from "@/components/inventory/forms/material-form";

const acceptedFileTypeOptions = Object.keys(FILE_CATEGORIES).map(
  (category) => ({
    label: category,
    value: category,
  }),
);

const statusOptions = [
  { label: ServiceStatus.AVAILABLE, value: ServiceStatus.AVAILABLE },
  { label: ServiceStatus.UNAVAILABLE, value: ServiceStatus.UNAVAILABLE },
];

const EMPTY_UPLOADED_FILES: UploadedFile[] = [];

/** @internal Context for passing a locked service-category mode to sub-forms. */
export const ServiceFormModeContext = createContext<
  "WORKSHOP" | "FABRICATION" | undefined
>(undefined);

export interface ServiceFormProps {
  title: string;
  initialValues: AddServiceFormValues;
  initialImages?: UploadedFile[];
  initialSamples?: UploadedFile[];
  onSubmit: (values: AddServiceFormValues) => Promise<boolean>;
  onDiscard: (formValues: AddServiceFormValues) => Promise<void> | void;
  submitError: string | null;
  /** When set, locks the service category and only renders relevant sections. */
  mode?: "WORKSHOP" | "FABRICATION";
  /** Override the back button destination. */
  backHref?: string;
}

export function ServiceForm({
  title,
  initialValues,
  initialImages = EMPTY_UPLOADED_FILES,
  initialSamples = EMPTY_UPLOADED_FILES,
  onSubmit,
  onDiscard,
  submitError,
  mode,
  backHref = "/dashboard/services",
}: ServiceFormProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [samplesUploading, setSamplesUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const hasUploadsInProgress = thumbnailUploading || samplesUploading;

  // Inline add-new dialogs for resources and materials
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [addResourceType, setAddResourceType] = useState<InventoryItemType | null>(null);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);

  const resourcesQuery = useQuery(api.resource.query.getResources) || [];
  const resourceOptions = resourcesQuery.map((r) => ({
    label: r.name,
    value: r._id,
  }));

  const materialsQuery = useQuery(api.materials.query.getMaterials) || [];
  const materialOptions = materialsQuery.map((m) => ({
    label: m.name,
    value: m._id,
  }));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const didSubmit = await onSubmit(value);
      setIsSuccess(didSubmit);
    },
  });

  return (
    <ServiceFormModeContext.Provider value={mode}>
      <main className="container mx-auto max-w-6xl p-10">
        {/* Top Navigation & Actions */}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between pt-3 mb-8 bg-background pb-4 ${
            isScrolled ? "border-b border-gray-200" : "border-b-0"
          }`}
        >
          <div className="flex items-center gap-4">
            <Link href={backHref}>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {submitError && (
              <p className="text-sm text-red-500 max-w-xs text-right">
                {submitError}
              </p>
            )}
            <ActionDialog
              onConfirm={async () => {
                await onDiscard(form.state.values);
                form.reset();
              }}
              title="Discard changes?"
              description="Are you sure you want to discard your changes? This cannot be undone."
              baseActionText="Discard"
              confirmButtonText="Confirm Discard"
              className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
            />
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="button"
                  className="bg-[#1A8A7E] hover:bg-[#156E65] px-8 font-medium rounded-lg"
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    hasUploadsInProgress ||
                    isSuccess
                  }
                  onClick={() => form.handleSubmit()}
                >
                  {isSubmitting || isSuccess
                    ? "Saving..."
                    : hasUploadsInProgress
                      ? "Uploading..."
                      : "Save Service"}
                </Button>
              )}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-5 space-y-5">
            <GeneralInfoForm form={form} />
            <PricingForm form={form} />
            <RequirementsForm form={form} />

            {/* Sample Projects */}
            <form.Field
              name="samples"
              children={(field) => (
                <FileUpload
                  title="Sample Projects"
                  accept="*/*"
                  value={initialSamples}
                  onFilesChange={(files) =>
                    field.handleChange(
                      files.map((f) => f.storageId as Id<"_storage">),
                    )
                  }
                  onUploadingChange={setSamplesUploading}
                />
              )}
            />
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3 space-y-4">
            <form.Field
              name="images"
              validators={{
                onSubmit: ({ value }) =>
                  value.length === 0
                    ? "At least one thumbnail is required"
                    : undefined,
              }}
              children={(field) => (
                <>
                  <FileUpload
                    title="Thumbnail"
                    accept="*/*"
                    value={initialImages}
                    onFilesChange={(files) =>
                      field.handleChange(
                        files.map((f) => f.storageId as Id<"_storage">),
                      )
                    }
                    onUploadingChange={setThumbnailUploading}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      {field.state.meta.errors[0]?.toString()}
                    </p>
                  )}
                </>
              )}
            />

            <form.Subscribe
              selector={(state) => state.values.serviceCategory}
              children={(serviceCategory) =>
                (mode ?? serviceCategory) === "FABRICATION" ? (
                  <>
                    <form.Field
                      name="resources"
                      children={(field) => (
                        <MultipleSelectForm
                          options={resourceOptions}
                          title="Resources"
                          placeholder="Select resources..."
                          value={field.state.value || []}
                          onChange={field.handleChange}
                          onAddNew={() => setAddResourceOpen(true)}
                        />
                      )}
                    />
                    <form.Field
                      name="materials"
                      children={(field) => (
                        <MultipleSelectForm
                          options={materialOptions}
                          title="Allowed Materials"
                          placeholder="Select materials..."
                          value={field.state.value || []}
                          onChange={field.handleChange}
                          onAddNew={() => setAddMaterialOpen(true)}
                        />
                      )}
                    />
                  </>
                ) : null
              }
            />

            <form.Field
              name="fileTypes"
              children={(field) => (
                <MultipleSelectForm
                  options={acceptedFileTypeOptions}
                  title="Accepted File Types"
                  placeholder="Select file type..."
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            />

            <form.AppField
              name="status"
              children={(field) => (
                <div className="w-full sm:max-w-3xl">
                  <FormSection title="Status">
                    <field.SelectInput
                      label=""
                      placeholder="Select status..."
                      options={statusOptions}
                    />
                  </FormSection>
                </div>
              )}
            />
          </div>
        </div>

        {/* ── Add Resource Dialog ─────────────────────────────────────── */}
        <Dialog
          open={addResourceOpen}
          onOpenChange={(open) => {
            setAddResourceOpen(open);
            if (!open) setAddResourceType(null);
          }}
        >
          <DialogContent
            className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
            showCloseButton={false}
          >
            {addResourceType === null ? (
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
                  {(
                    [
                      { type: "machine" as const, label: "Machine", desc: "3D printers, CNC, laser cutters" },
                      { type: "tool" as const, label: "Tool", desc: "Power tools, hand tools, measurement" },
                      { type: "room" as const, label: "Room", desc: "Workshop areas, meeting rooms" },
                      { type: "misc" as const, label: "Misc", desc: "General items, consumables" },
                    ] satisfies Array<{ type: InventoryItemType; label: string; desc: string }>
                  ).map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setAddResourceType(opt.type)}
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
                itemType={addResourceType}
                mode="add"
                onSuccess={() => {
                  setAddResourceOpen(false);
                  setAddResourceType(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ── Add Material Dialog ──────────────────────────────────────── */}
        <Dialog
          open={addMaterialOpen}
          onOpenChange={setAddMaterialOpen}
        >
          <DialogContent
            className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
            showCloseButton={false}
          >
            <MaterialForm
              mode="add"
              onSuccess={() => setAddMaterialOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
    </ServiceFormModeContext.Provider>
  );
}
