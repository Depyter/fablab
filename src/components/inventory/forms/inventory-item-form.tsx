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
import {
  ResourceCategoryType,
  ResourceStatusType,
  ResourceStatus,
} from "@convex/constants";

export type InventoryItemType = ResourceCategoryType;

export type InventoryItemFormValues = {
  name: string;
  description: string;
  type: string;
  status: ResourceStatusType;
  thumbnail: string[]; // storage IDs
};

const ITEM_CONFIG: Record<
  InventoryItemType,
  {
    title: string;
    typeLabel: string;
    typeOptions: { label: string; value: string }[];
  }
> = {
  machine: {
    title: "Machine",
    typeLabel: "Machine Type",
    typeOptions: [
      { label: "3D Printer", value: "3D Printer" },
      { label: "CNC Mill", value: "CNC Mill" },
      { label: "Laser Cutter", value: "Laser Cutter" },
    ],
  },
  tool: {
    title: "Tool",
    typeLabel: "Tool Category",
    typeOptions: [
      { label: "Power Tool", value: "Power Tool" },
      { label: "Hand Tool", value: "Hand Tool" },
      { label: "Measurement", value: "Measurement" },
      { label: "Other", value: "Other" },
    ],
  },
  room: {
    title: "Room",
    typeLabel: "Room Type",
    typeOptions: [
      { label: "Workshop Area", value: "Workshop Area" },
      { label: "Meeting Room", value: "Meeting Room" },
      { label: "Storage Room", value: "Storage Room" },
      { label: "Office", value: "Office" },
    ],
  },
  misc: {
    title: "Item",
    typeLabel: "Category",
    typeOptions: [
      { label: "General", value: "General" },
      { label: "Consumable", value: "Consumable" },
      { label: "Other", value: "Other" },
    ],
  },
};

interface InventoryItemFormProps {
  itemType: InventoryItemType;
  mode?: "add" | "edit";
  initialValues?: Partial<InventoryItemFormValues> & { _id?: string };
  initialImages?: UploadedFile[];
  onSuccess?: () => void;
}

export function InventoryItemForm({
  itemType,
  mode = "add",
  initialValues,
  initialImages = [],
  onSuccess,
}: InventoryItemFormProps) {
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const config = ITEM_CONFIG[itemType];
  const isEdit = mode === "edit";

  const addResource = useMutation(api.resource.mutate.addResource);
  const updateResource = useMutation(api.resource.mutate.updateResource);
  const deleteResource = useMutation(api.resource.mutate.deleteResource);
  const addImageToResource = useMutation(
    api.resource.mutate.addImageToResource,
  );
  const deleteImageFromResource = useMutation(
    api.resource.mutate.deleteImageFromResource,
  );

  const handleThumbnailUploading = (isUploading: boolean) =>
    setThumbnailUploading(isUploading);

  const form = useAppForm({
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      type: initialValues?.type ?? config.typeOptions[0].value,
      status: initialValues?.status ?? ResourceStatus.AVAILABLE,
      thumbnail: initialValues?.thumbnail ?? ([] as string[]),
    } as InventoryItemFormValues,
    onSubmit: async ({ value }) => {
      const actionPromise = isEdit
        ? updateResource({
            id: initialValues?._id as Id<"resources">,
            name: value.name,
            description: value.description,
            type: value.type,
            status: value.status,
          })
        : addResource({
            name: value.name,
            description: value.description,
            category: itemType,
            type: value.type,
            images: value.thumbnail as Id<"_storage">[],
            status: value.status,
          });

      toast.promise(actionPromise, {
        loading: `${isEdit ? "Updating" : "Adding"} ${config.title.toLowerCase()}...`,
        success: () => {
          onSuccess?.();
          return `${config.title} ${isEdit ? "updated" : "added"} successfully!`;
        },
        error: (err) =>
          `Failed to ${isEdit ? "update" : "add"} ${config.title.toLowerCase()}: ${err instanceof Error ? err.message : "Please try again."}`,
        position: "top-center",
      });
    },
  });

  const handleDelete = async () => {
    if (!initialValues?._id) return;

    toast.promise(
      deleteResource({ id: initialValues._id as Id<"resources"> }),
      {
        loading: `Deleting ${config.title.toLowerCase()}...`,
        success: () => {
          onSuccess?.();
          return `${config.title} deleted successfully!`;
        },
        error: "Failed to delete item. Please try again.",
        position: "top-center",
      },
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-background">
      {/* Accessibility primitives for DialogContent requirements */}
      <DialogTitle className="sr-only">
        {isEdit ? "Edit" : "Add New"} {config.title}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {isEdit ? "Edit details for" : "Create a new entry for"} a{" "}
        {config.title.toLowerCase()} in the inventory.
      </DialogDescription>

      <header className="sticky top-0 bg-white z-50 p-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Edit" : "Add New"} {config.title}
        </h2>
      </header>

      <form
        id="inventory-item-form"
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
                description={`Provide details about your ${config.title.toLowerCase()}.`}
                className="mt-4 space-y-4"
              >
                <form.AppField
                  name="name"
                  children={(field) => (
                    <field.TextInput
                      label="Name"
                      placeholder={`e.g. ${config.title} Name`}
                      required
                    />
                  )}
                />

                <form.AppField
                  name="description"
                  children={(field) => (
                    <field.TextareaInput
                      label="Description"
                      placeholder={`Describe the ${config.title.toLowerCase()}...`}
                      className="resize-height w-full"
                      rows={4}
                      required
                    />
                  )}
                />
              </FormSection>
            </FieldSet>
          </div>

          <div>
            <form.Field
              name="thumbnail"
              children={(field) => (
                <FileUpload
                  title="Images"
                  accept="*/*"
                  multiple={true}
                  value={initialImages}
                  onAddFile={
                    isEdit
                      ? async (file) => {
                          await addImageToResource({
                            resource: initialValues?._id as Id<"resources">,
                            image: file.storageId as Id<"_storage">,
                          });
                        }
                      : undefined
                  }
                  onRemoveFile={
                    isEdit
                      ? async (file) => {
                          await deleteImageFromResource({
                            resource: initialValues?._id as Id<"resources">,
                            image: file.storageId as Id<"_storage">,
                          });
                        }
                      : undefined
                  }
                  onFilesChange={(files) =>
                    field.handleChange(files.map((f) => f.storageId))
                  }
                  onUploadingChange={handleThumbnailUploading}
                />
              )}
            />
          </div>

          <div className="space-y-4">
            <FormSection
              title="Details"
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <form.AppField
                name="type"
                children={(field) => (
                  <field.SelectInput
                    label={config.typeLabel}
                    placeholder="Select type"
                    options={config.typeOptions}
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
                      {
                        label: ResourceStatus.AVAILABLE,
                        value: ResourceStatus.AVAILABLE,
                      },
                      {
                        label: ResourceStatus.UNAVAILABLE,
                        value: ResourceStatus.UNAVAILABLE,
                      },
                      {
                        label: ResourceStatus.UNDER_MAINTENANCE,
                        value: ResourceStatus.UNDER_MAINTENANCE,
                      },
                    ]}
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
              title={`Delete ${config.title}?`}
              description={`Are you sure you want to delete this ${config.title.toLowerCase()}? This action cannot be undone.`}
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
              description={`Are you sure you want to discard your changes?`}
              baseActionText="Cancel"
              confirmButtonText="Confirm"
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  form="inventory-item-form"
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
                        : `Add ${config.title}`}
                </Button>
              )}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
