"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/file-upload/file-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActionDialog } from "@/components/action-dialog";
import { toast } from "sonner";
import { useAppForm } from "@/lib/form-context";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type InventoryItemType = "machine" | "tool" | "room" | "misc";

export type InventoryItemFormValues = {
  name: string;
  description: string;
  type: string;
  status: string;
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
  initialValues?: Partial<InventoryItemFormValues>;
  onSuccess?: () => void;
}

export function InventoryItemForm({
  itemType,
  mode = "add",
  initialValues,
  onSuccess,
}: InventoryItemFormProps) {
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const config = useMemo(() => ITEM_CONFIG[itemType], [itemType]);
  const isEdit = mode === "edit";

  const handleThumbnailUploading = useCallback(
    (isUploading: boolean) => setThumbnailUploading(isUploading),
    [],
  );

  const form = useAppForm({
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      type: initialValues?.type ?? config.typeOptions[0].value,
      status: initialValues?.status ?? "Available",
      thumbnail: initialValues?.thumbnail ?? ([] as string[]),
    } as InventoryItemFormValues,
    onSubmit: async ({ value }) => {
      const actionLabel = isEdit ? "Updating" : "Adding";
      console.log(`${actionLabel} ${config.title}...`, value);

      toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
        loading: `${actionLabel} ${config.title.toLowerCase()}...`,
        success: `${config.title} ${isEdit ? "updated" : "added"} successfully!`,
        error: `Failed to ${isEdit ? "update" : "add"} ${config.title.toLowerCase()}. Please try again.`,
        position: "top-center",
      });

      onSuccess?.();
    },
  });

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
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-lg">
                    General Information
                  </CardTitle>
                  <CardDescription>
                    Provide details about your {config.title.toLowerCase()}.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <FieldGroup className="mt-4 space-y-4">
                    <form.Field
                      name="name"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                          <Input
                            id={field.name}
                            placeholder={`e.g. ${config.title} Name`}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                          />
                        </Field>
                      )}
                    />

                    <form.Field
                      name="description"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Description
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            placeholder={`Describe the ${config.title.toLowerCase()}...`}
                            className="resize-height w-full"
                            rows={4}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                          />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </CardContent>
              </Card>
            </FieldSet>
          </div>

          <div>
            <form.Field
              name="thumbnail"
              children={(field) => (
                <FileUpload
                  title="Thumbnail"
                  accept="image/png, image/jpeg, image/jpg"
                  multiple={false}
                  onFilesChange={(files) =>
                    field.handleChange(files.map((f) => f.storageId))
                  }
                  onUploadingChange={handleThumbnailUploading}
                />
              )}
            />
          </div>

          <div className="space-y-4">
            <FieldSet>
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-lg">Details</CardTitle>
                </CardHeader>

                <CardContent>
                  <FieldGroup className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <form.Field
                      name="type"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            {config.typeLabel}
                          </FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={field.handleChange}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {config.typeOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />

                    <form.Field
                      name="status"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={field.handleChange}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="Available">
                                  Available
                                </SelectItem>
                                <SelectItem value="Unavailable">
                                  Unavailable
                                </SelectItem>
                                <SelectItem value="Under Maintenance">
                                  Under Maintenance
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </CardContent>
              </Card>
            </FieldSet>
          </div>
        </div>
      </form>
      <footer className="sticky bottom-0 bg-white z-10 p-4 border-t">
        <div className="flex justify-end gap-3">
          <ActionDialog
            onConfirm={() => form.reset()}
            title={`Cancel ${config.title} ${isEdit ? "Edit" : "Addition"}?`}
            description={`Are you sure you want to cancel ${isEdit ? "editing" : "adding"} this ${config.title.toLowerCase()}?`}
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
      </footer>
    </div>
  );
}
