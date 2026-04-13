"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppForm } from "@/lib/form-context";
import {
  useMutation,
  useQuery,
  usePreloadedQuery,
  Preloaded,
} from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GeneralInfoForm } from "@/components/services/forms/general-info-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { MultipleSelectForm } from "@/components/services/forms/multiple-select-form";
import { FormSection } from "@/components/ui/form-section";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import type { AddServiceFormValues } from "@/types/add-service";
import { ManageHeader } from "@/components/manage/manage-layout";
import { ActionDialog } from "@/components/action-dialog";
import { toast } from "sonner";
import { ServiceStatus, FILE_CATEGORIES } from "@convex/constants";

const acceptedFileTypeOptions = Object.keys(FILE_CATEGORIES).map(
  (category) => ({
    label: category,
    value: category,
  }),
);

// status options aligned with the backend literals
const statusOptions = [
  { label: ServiceStatus.AVAILABLE, value: ServiceStatus.AVAILABLE },
  { label: ServiceStatus.UNAVAILABLE, value: ServiceStatus.UNAVAILABLE },
];

export function EditServiceClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedQuery(preloadedService);
  const router = useRouter();
  const deleteService = useMutation(api.services.mutate.deleteService);

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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [samplesUploading, setSamplesUploading] = useState(false);

  const hasUploadsInProgress = thumbnailUploading || samplesUploading;

  const handleThumbnailUploading = (isUploading: boolean) =>
    setThumbnailUploading(isUploading);
  const handleSamplesUploading = (isUploading: boolean) =>
    setSamplesUploading(isUploading);

  const updateService = useMutation(api.services.mutate.updateService);
  const addImageToService = useMutation(api.services.mutate.addImageToService);
  const deleteImageFromService = useMutation(
    api.services.mutate.deleteImageFromService,
  );
  const addSampleToService = useMutation(
    api.services.mutate.addSampleToService,
  );
  const deleteSampleFromService = useMutation(
    api.services.mutate.deleteSampleFromService,
  );

  // Convert existing storage IDs into UploadedFile entries so FileUpload can
  // render them as "already uploaded" items.
  const [initialUploadedImages] = useState<UploadedFile[]>(() =>
    (service?.images ?? []).map((id, i) => ({
      storageId: id,
      fileName: `Image ${i + 1}`,
      fileType: "image/jpeg",
      fileSize: 0,
      uploadedAt: new Date(),
      url: service?.imageUrls?.[i],
    })),
  );

  const [initialUploadedSamples] = useState<UploadedFile[]>(() =>
    (service?.samples ?? []).map((id, i) => ({
      storageId: id,
      fileName: `Sample ${i + 1}`,
      fileType: "image/jpeg",
      fileSize: 0,
      uploadedAt: new Date(),
      url: service?.sampleUrls?.[i],
    })),
  );

  const form = useAppForm({
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      serviceCategory: service?.serviceCategory ?? "WORKSHOP",
      pricing: service?.pricing ?? { type: "FIXED", amount: 0 },
      status: (service?.status ??
        "Available") as AddServiceFormValues["status"],
      images: (service?.images ?? []) as string[],
      samples: (service?.samples ?? []) as string[],
      requirements:
        service?.requirements && service.requirements.length > 0
          ? service.requirements
          : [""],
      fileTypes: (service?.fileTypes ?? []) as string[],
      resources: (service?.resources ?? []) as string[],
      materials: (service?.materials ?? []) as string[],
      availableDays: service?.availableDays ?? [],
    },
    onSubmit: async ({ value }) => {
      if (!service) return;
      setSubmitError(null);

      try {
        const updatePromise = updateService({
          service: service._id as Id<"services">,
          name: value.name,
          description: value.description,
          serviceCategory: value.serviceCategory,
          pricing: value.pricing,
          status: value.status,
          requirements: value.requirements.filter((r) => r.trim() !== ""),
          fileTypes: value.fileTypes,
          resources: value.resources as Id<"resources">[],
          materials: value.materials as Id<"materials">[],
          availableDays: value.availableDays,
        });

        toast.promise(updatePromise, {
          loading: "Saving changes...",
          success: "Service updated successfully!",
          error: "Failed to save changes. Please try again.",
        });

        await updatePromise;

        // Navigate to the (possibly renamed) service detail page.
        router.push(`/dashboard/services/`);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please try again.",
        );
      }
    },
  });

  const handleDeleteService = async () => {
    if (!service) return;
    try {
      const deletePromise = deleteService({
        service: service._id as Id<"services">,
      });
      toast.promise(deletePromise, {
        loading: "Deleting service...",
        success: `Service "${service.name}" deleted successfully!`,
        error: "Failed to delete service. Please try again.",
      });
      await deletePromise;
      router.push("/dashboard/services");
    } catch {
      // Handle error silently
    }
  };

  // Guard against the service being deleted while the user is on this page.
  if (service === null) {
    return (
      <>
        <ManageHeader title="Service Not Found">
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </Link>
        </ManageHeader>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-muted-foreground">
            This service no longer exists.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ManageHeader title={`Edit ${service.name}`}>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          {submitError && (
            <p className="text-sm text-red-500 max-w-xs text-right mr-2 hidden sm:block">
              {submitError}
            </p>
          )}

          <ActionDialog
            onConfirm={() => {
              form.reset();
              setSubmitError(null);
            }}
            title="Discard Changes?"
            description="Are you sure you want to discard all changes?"
            baseActionText="Discard"
            confirmButtonText="Confirm"
            className="h-8 text-xs font-medium"
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1"
                disabled={!canSubmit || isSubmitting || hasUploadsInProgress}
                onClick={() => form.handleSubmit()}
              >
                {isSubmitting
                  ? "Saving..."
                  : hasUploadsInProgress
                    ? "Uploading..."
                    : "Save Changes"}
              </Button>
            )}
          />
        </div>
      </ManageHeader>

      <div className="p-4 sm:p-6 overflow-y-auto flex-1">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
            {/* Left column */}
            <div className="lg:col-span-5 space-y-5">
              <GeneralInfoForm form={form} />
              <PricingForm form={form} />
              <RequirementsForm form={form} />

              {/* Sample projects — inlined so we can pass initial files */}
              <form.Field
                name="samples"
                children={(field) => (
                  <FileUpload
                    title="Sample Projects"
                    accept="*/*"
                    value={initialUploadedSamples}
                    onAddFile={async (file) => {
                      const addSamplePromise = addSampleToService({
                        service: service._id as Id<"services">,
                        sample: file.storageId as Id<"_storage">,
                      });
                      toast.promise(addSamplePromise, {
                        loading: "Adding sample project...",
                        success: "Sample project added successfully!",
                        error: "Failed to add sample project. Please try again.",
                      });
                      await addSamplePromise;
                    }}
                    onRemoveFile={async (file) => {
                      const removeSamplePromise = deleteSampleFromService({
                        service: service._id as Id<"services">,
                        sample: file.storageId as Id<"_storage">,
                      });
                      toast.promise(removeSamplePromise, {
                        loading: "Removing sample project...",
                        success: "Sample project removed successfully!",
                        error:
                          "Failed to remove sample project. Please try again.",
                      });
                      await removeSamplePromise;
                    }}
                    onFilesChange={(files) =>
                      field.handleChange(files.map((f) => f.storageId))
                    }
                    onUploadingChange={handleSamplesUploading}
                  />
                )}
              />
            </div>

            {/* Right column */}
            <div className="lg:col-span-3 space-y-4">
              {/* Thumbnail — inlined so we can pass initial files */}
              <form.Field
                name="images"
                children={(field) => (
                  <>
                    <FileUpload
                      title="Thumbnail"
                      accept="*/*"
                      value={initialUploadedImages}
                      onAddFile={async (file) => {
                        const addImagePromise = addImageToService({
                          service: service._id as Id<"services">,
                          image: file.storageId as Id<"_storage">,
                        });
                        toast.promise(addImagePromise, {
                          loading: "Adding thumbnail...",
                          success: "Thumbnail added successfully!",
                          error: "Failed to add thumbnail. Please try again.",
                        });
                        await addImagePromise;
                      }}
                      onRemoveFile={async (file) => {
                        const removeImagePromise = deleteImageFromService({
                          service: service._id as Id<"services">,
                          image: file.storageId as Id<"_storage">,
                        });
                        toast.promise(removeImagePromise, {
                          loading: "Removing thumbnail...",
                          success: "Thumbnail removed successfully!",
                          error:
                            "Failed to remove thumbnail. Please try again.",
                        });
                        await removeImagePromise;
                      }}
                      onFilesChange={(files) =>
                        field.handleChange(files.map((f) => f.storageId))
                      }
                      onUploadingChange={handleThumbnailUploading}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        {String(field.state.meta.errors[0])}
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
                    value={field.state.value}
                    onChange={field.handleChange}
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
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                )}
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

          <div className="mt-12 rounded-lg border border-destructive bg-destructive/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h3 className="font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                Once you delete a service, there is no going back. Please be
                certain.
              </p>
            </div>
            <ActionDialog
              onConfirm={handleDeleteService}
              title="Delete Service?"
              description="Are you sure you want to delete this service? This action cannot be undone."
              baseActionText="Delete Service"
              confirmButtonText="Confirm Delete"
              className="bg-destructive hover:bg-destructive/90 text-white shadow-sm"
            />
          </div>
        </div>
      </div>
    </>
  );
}
