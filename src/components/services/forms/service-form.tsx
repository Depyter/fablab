"use client";

import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppForm } from "@/lib/form-context";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

import { GeneralInfoForm } from "@/components/services/forms/general-info-form";
import { WorkshopScheduleForm } from "@/components/services/forms/workshop-schedule-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { MultipleSelectForm } from "@/components/services/forms/multiple-select-form";
import { FormSection } from "@/components/ui/form-section";
import { FileUpload } from "@/components/file-upload";
import { AddServiceFormValues } from "@/types/add-service";
import { ServiceStatus, FILE_CATEGORIES } from "@convex/constants";

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

export interface ServiceFormProps {
  title: string;
  initialValues: AddServiceFormValues;
  onSubmit: (values: AddServiceFormValues) => Promise<void>;
  onDiscard: (formValues: AddServiceFormValues) => Promise<void> | void;
  submitError: string | null;
}

export function ServiceForm({
  title,
  initialValues,
  onSubmit,
  onDiscard,
  submitError,
}: ServiceFormProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [samplesUploading, setSamplesUploading] = useState(false);
  const hasUploadsInProgress = thumbnailUploading || samplesUploading;

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
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <main className="container mx-auto max-w-6xl p-10">
      {/* Top Navigation & Actions */}
      <header
        className={`sticky top-0 z-10 flex items-center justify-between pt-3 mb-8 bg-background pb-4 ${
          isScrolled ? "border-b border-gray-200" : "border-b-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Link href="/dashboard/services">
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
          <Button
            type="button"
            variant="outline"
            className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
            onClick={async () => {
              await onDiscard(form.state.values);
              form.reset();
            }}
          >
            Discard
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="button"
                className="bg-[#1A8A7E] hover:bg-[#156E65] px-8 font-medium rounded-lg"
                disabled={!canSubmit || isSubmitting || hasUploadsInProgress}
                onClick={() => form.handleSubmit()}
              >
                {isSubmitting
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
          <WorkshopScheduleForm form={form} />
          <PricingForm form={form} />
          <RequirementsForm form={form} />

          {/* Sample Projects */}
          <form.Field
            name="samples"
            children={(field) => (
              <FileUpload
                title="Sample Projects"
                accept="*/*"
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

          <form.Field
            name="resources"
            children={(field) => (
              <MultipleSelectForm
                options={resourceOptions}
                title="Resources (Machines, etc.)"
                placeholder="Select resource..."
                value={field.state.value || []}
                onChange={(val) => field.handleChange(val as Id<"resources">[])}
              />
            )}
          />

          <form.Subscribe
            selector={(state) => state.values.serviceCategory}
            children={(serviceCategory) =>
              serviceCategory === "FABRICATION" ? (
                <form.Field
                  name="materials"
                  children={(field) => (
                    <MultipleSelectForm
                      options={materialOptions}
                      title="Allowed Materials"
                      placeholder="Select materials..."
                      value={field.state.value || []}
                      onChange={(val) =>
                        field.handleChange(val as Id<"materials">[])
                      }
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
                    label="Status"
                    placeholder="Select status..."
                    options={statusOptions}
                  />
                </FormSection>
              </div>
            )}
          />
        </div>
      </div>
    </main>
  );
}
