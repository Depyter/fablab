"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldSet } from "@/components/ui/field";
import { FileUpload } from "@/components/file-upload/file-upload";
import type { UploadedFile } from "@/components/file-upload/types";
import { ActionDialog } from "@/components/action-dialog";
import { FormSection } from "@/components/ui/form-section";
import { toast } from "sonner";
import { useAppForm } from "@/lib/form-context";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export type MaterialFormValues = {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  costPerUnit: number;
  pricePerUnit: number;
  reorderThreshold: number;
  color: string;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  image: string; // storage ID
};

interface MaterialFormProps {
  mode?: "add" | "edit";
  initialValues?: Partial<MaterialFormValues> & { _id?: string };
  initialImages?: UploadedFile[];
  onSuccess?: () => void;
}

export function MaterialForm({
  mode = "add",
  initialValues,
  initialImages = [],
  onSuccess,
}: MaterialFormProps) {
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const isEdit = mode === "edit";

  const addMaterial = useMutation(api.materials.mutate.addMaterial);
  const updateMaterial = useMutation(api.materials.mutate.updateMaterial);
  const deleteMaterial = useMutation(api.materials.mutate.deleteMaterial);

  const handleThumbnailUploading = (isUploading: boolean) =>
    setThumbnailUploading(isUploading);

  const form = useAppForm({
    defaultValues: {
      name: initialValues?.name ?? "",
      category: initialValues?.category ?? "Filament",
      unit: initialValues?.unit ?? "grams",
      currentStock: initialValues?.currentStock ?? 0,
      costPerUnit: initialValues?.costPerUnit ?? 0,
      pricePerUnit: initialValues?.pricePerUnit ?? 0,
      reorderThreshold: initialValues?.reorderThreshold ?? 0,
      color: initialValues?.color ?? "",
      status: initialValues?.status ?? "IN_STOCK",
      image: initialValues?.image ?? "",
    } as MaterialFormValues,
    onSubmit: async ({ value }) => {
      const actionPromise = isEdit
        ? updateMaterial({
            id: initialValues?._id as Id<"materials">,
            name: value.name,
            category: value.category,
            unit: value.unit,
            currentStock: value.currentStock,
            costPerUnit: value.costPerUnit,
            pricePerUnit: value.pricePerUnit,
            reorderThreshold: value.reorderThreshold,
            color: value.color,
            status: value.status,
            image: value.image ? (value.image as Id<"_storage">) : undefined,
          })
        : addMaterial({
            name: value.name,
            category: value.category,
            unit: value.unit,
            currentStock: value.currentStock,
            costPerUnit: value.costPerUnit,
            pricePerUnit: value.pricePerUnit,
            reorderThreshold: value.reorderThreshold,
            color: value.color,
            status: value.status,
            image: value.image ? (value.image as Id<"_storage">) : undefined,
          });

      toast.promise(actionPromise, {
        loading: `${isEdit ? "Updating" : "Adding"} material...`,
        success: () => {
          onSuccess?.();
          return `Material ${isEdit ? "updated" : "added"} successfully!`;
        },
        error: (err) =>
          `Failed to ${isEdit ? "update" : "add"} material: ${err instanceof Error ? err.message : "Please try again."}`,
        position: "top-center",
      });
    },
  });

  const handleDelete = async () => {
    if (!initialValues?._id) return;

    toast.promise(deleteMaterial({ id: initialValues._id as Id<"materials"> }), {
      loading: `Deleting material...`,
      success: () => {
        onSuccess?.();
        return `Material deleted successfully!`;
      },
      error: "Failed to delete item. Please try again.",
      position: "top-center",
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-background">
      <DialogTitle className="sr-only">
        {isEdit ? "Edit" : "Add New"} Material
      </DialogTitle>
      <DialogDescription className="sr-only">
        {isEdit ? "Edit details for" : "Create a new entry for"} a material in
        the inventory.
      </DialogDescription>

      <header className="sticky top-0 bg-white z-50 p-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Edit" : "Add New"} Material
        </h2>
      </header>

      <form
        id="material-form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="grow no-scrollbar overflow-y-auto p-6 space-y-6"
      >
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <FieldSet>
              <FormSection
                title="General Information"
                description="Provide details about this material."
                className="mt-4 space-y-4"
              >
                <form.AppField
                  name="name"
                  children={(field) => (
                    <field.TextInput
                      label="Name"
                      placeholder="e.g. PLA Red"
                      required
                    />
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <form.AppField
                    name="category"
                    children={(field) => (
                      <field.TextInput
                        label="Category"
                        placeholder="e.g. Filament, Wood, Kits"
                        required
                      />
                    )}
                  />

                  <form.AppField
                    name="color"
                    children={(field) => (
                      <field.TextInput label="Color" placeholder="e.g. Red" />
                    )}
                  />
                </div>
              </FormSection>
            </FieldSet>
          </div>

          <div>
            <form.Field
              name="image"
              children={(field) => (
                <FileUpload
                  title="Image"
                  accept="image/*"
                  multiple={false}
                  value={initialImages}
                  onFilesChange={(files) =>
                    field.handleChange(
                      files.length > 0 ? files[0].storageId : "",
                    )
                  }
                  onUploadingChange={handleThumbnailUploading}
                />
              )}
            />
          </div>

          <div className="space-y-4">
            <FormSection
              title="Inventory & Pricing"
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <form.AppField
                name="unit"
                children={(field) => (
                  <field.TextInput
                    label="Unit"
                    placeholder="e.g. grams, pcs"
                    required
                  />
                )}
              />

              <form.AppField
                name="currentStock"
                children={(field) => (
                  <field.NumberInput
                    label="Current Stock"
                    min={0}
                    step={1}
                    required
                  />
                )}
              />

              <form.AppField
                name="reorderThreshold"
                children={(field) => (
                  <field.NumberInput
                    label="Reorder Threshold"
                    min={0}
                    step={1}
                  />
                )}
              />

              <form.AppField
                name="status"
                children={(field) => (
                  <field.SelectInput
                    label="Status"
                    placeholder="Select status"
                    options={[
                      { label: "In Stock", value: "IN_STOCK" },
                      { label: "Low Stock", value: "LOW_STOCK" },
                      { label: "Out of Stock", value: "OUT_OF_STOCK" },
                    ]}
                  />
                )}
              />

              <form.AppField
                name="costPerUnit"
                children={(field) => (
                  <field.NumberInput
                    label="Cost per Unit"
                    min={0}
                    step={0.01}
                  />
                )}
              />

              <form.AppField
                name="pricePerUnit"
                children={(field) => (
                  <field.NumberInput
                    label="Price per Unit"
                    min={0}
                    step={0.01}
                  />
                )}
              />
            </FormSection>
          </div>
        </div>
      </form>
      <footer className="sticky bottom-0 bg-white z-10 p-4 border-t">
        <div className="flex justify-between items-center gap-3">
          {isEdit ? (
            <ActionDialog
              onConfirm={handleDelete}
              title="Delete Material?"
              description="Are you sure you want to delete this material? This action cannot be undone."
              baseActionText="Delete"
              confirmButtonText="Confirm Delete"
              className="bg-red-500 text-white hover:bg-red-600 hover:text-white px-10 font-medium rounded-lg"
            />
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <ActionDialog
              onConfirm={() => {
                form.reset();
                onSuccess?.(); // Close dialog on discard
              }}
              title={`Discard ${isEdit ? "Edit" : "Addition"}?`}
              description="Are you sure you want to discard your changes?"
              baseActionText="Cancel"
              confirmButtonText="Confirm"
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  form="material-form"
                  disabled={!canSubmit || isSubmitting || thumbnailUploading}
                  className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg"
                >
                  {isSubmitting
                    ? isEdit
                      ? "Saving..."
                      : "Adding..."
                    : thumbnailUploading
                      ? "Uploading..."
                      : isEdit
                        ? "Update"
                        : "Add Material"}
                </Button>
              )}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
