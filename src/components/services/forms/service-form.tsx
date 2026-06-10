import type { ServiceStatusType } from "@convex/constants";
import { FILE_CATEGORIES, ServiceStatus } from "@convex/constants";
import type * as React from "react";
import { createContext, useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/../convex/_generated/dataModel";
import { ActionDialog } from "@/components/action-dialog";
import { FileUpload } from "@/components/file-upload";
import type { UploadedFile } from "@/components/file-upload/types";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import { GeneralInfoForm } from "@/components/services/forms/general-info-form";
import {
  InlineMaterialSelect,
  InlineResourceSelect,
} from "@/components/services/forms/inline-resource-material-select";
import { MultipleSelectForm } from "@/components/services/forms/multiple-select-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppForm } from "@/lib/form-context";
import type { AddServiceFormValues } from "@/types/add-service";

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

const EMPTY_UPLOADED_FILES: Array<UploadedFile> = [];

/** @internal Context for passing a locked service-category mode to sub-forms. */
export const ServiceFormModeContext = createContext<
  "WORKSHOP" | "FABRICATION" | undefined
>(undefined);

export interface ServiceFormProps {
  title: string;
  initialValues: AddServiceFormValues;
  initialImages?: Array<UploadedFile>;
  initialSamples?: Array<UploadedFile>;
  onSubmit: (values: AddServiceFormValues) => Promise<boolean>;
  onDiscard: (formValues: AddServiceFormValues) => Promise<void> | void;
  submitError: string | null;
  /** When set, locks the service category and only renders relevant sections. */
  mode?: "WORKSHOP" | "FABRICATION";
  /** Override the back button destination. */
  backHref?: string;
  /** Optional content rendered at the bottom of the scrollable area. */
  footer?: React.ReactNode;
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
  backHref: _backHref = "/dashboard/services",
  footer,
}: ServiceFormProps) {
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [samplesUploading, setSamplesUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageFiles, setImageFiles] = useState(() => initialImages);
  const [sampleFiles, setSampleFiles] = useState(() => initialSamples);
  const hasUploadsInProgress = thumbnailUploading || samplesUploading;

  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const didSubmit = await onSubmit(value);
      setIsSuccess(didSubmit);
    },
  });

  const resetDisplayedFiles = () => {
    setImageFiles(initialImages);
    setSampleFiles(initialSamples);
  };

  return (
    <ServiceFormModeContext.Provider value={mode}>
      <DataViewPageHeader>
        {/* <Link href={backHref}>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-2 border-black bg-white text-black shrink-0"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={4} />
          </Button>
        </Link>*/}
        <h1 className="text-sm font-black uppercase tracking-wider text-black truncate">
          {title}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {submitError && (
            <p className="text-xs text-red-500 max-w-40 text-right hidden sm:block">
              {submitError}
            </p>
          )}
          <ActionDialog
            onConfirm={async () => {
              await onDiscard(form.state.values);
              form.reset();
              resetDisplayedFiles();
            }}
            title="Discard changes?"
            description="Are you sure you want to discard your changes? This cannot be undone."
            baseActionText="Discard"
            confirmButtonText="Confirm"
            className="h-9 border-2 border-black bg-white px-5 text-[12px] font-black uppercase tracking-wider text-black"
          />
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="button"
                className="h-9 border-2 border-black bg-fab-teal px-5 text-[12px] font-black uppercase rounded-lg tracking-wider text-white disabled:opacity-60"
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
                    : "Save"}
              </Button>
            )}
          />
        </div>
      </DataViewPageHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-8 gap-8">
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
                  value={sampleFiles}
                  onFilesChange={(files) => {
                    setSampleFiles(files);
                    field.handleChange(
                      files.map((f) => f.storageId as Id<"_storage">),
                    );
                  }}
                  onUploadingChange={setSamplesUploading}
                  onUploadError={(error) => {
                    toast.error(error.message || "Failed to upload file");
                  }}
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
                    title="Thumbnail *"
                    accept="*/*"
                    value={imageFiles}
                    onFilesChange={(files) => {
                      setImageFiles(files);
                      field.handleChange(
                        files.map((f) => f.storageId as Id<"_storage">),
                      );
                    }}
                    onUploadingChange={setThumbnailUploading}
                    onUploadError={(error) => {
                      toast.error(error.message || "Failed to upload file");
                    }}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      {field.state.meta.errors[0]?.toString()}
                    </p>
                  )}
                </>
              )}
            />

            {/* Resources, File Types & Status — grouped */}
            <FormSection title="Resources &amp; Settings">
              {/* Resources — available for all service types as defaults */}
              <form.Field
                name="resources"
                children={(field) => (
                  <InlineResourceSelect
                    value={field.state.value || []}
                    onChange={field.handleChange}
                  />
                )}
              />

              {/* Materials — FABRICATION only */}
              <form.Subscribe
                selector={(state) => state.values.serviceCategory}
                children={(serviceCategory) =>
                  (mode ?? serviceCategory) === "FABRICATION" ? (
                    <form.Field
                      name="materials"
                      children={(field) => (
                        <InlineMaterialSelect
                          value={field.state.value || []}
                          onChange={field.handleChange}
                        />
                      )}
                    />
                  ) : null
                }
              />

              <form.Field
                name="fileTypes"
                children={(field) => (
                  <MultipleSelectForm
                    compact
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
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                      Status
                    </div>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) =>
                        field.handleChange(val as ServiceStatusType)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </FormSection>
          </div>
        </div>
        {footer && <div className="mt-8 mx-auto max-w-6xl">{footer}</div>}
      </div>
    </ServiceFormModeContext.Provider>
  );
}
