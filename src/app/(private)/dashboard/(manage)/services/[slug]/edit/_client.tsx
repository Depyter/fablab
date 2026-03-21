"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppForm } from "@/lib/form-context";
import { useMutation } from "convex/react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GeneralInfoForm } from "@/components/services/forms/general-info-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { MachineSelectForm } from "@/components/services/forms/machine-select-form";
import { SelectForm } from "@/components/services/forms/select-form";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import type { AddServiceFormValues } from "@/types/add-service";
import { ActionDialog } from "@/components/action-dialog";
import { toast } from "sonner";

const machineOptions = [
  { label: "Machine 1", value: "machine-1" },
  { label: "Machine 2", value: "machine-2" },
  { label: "Machine 3", value: "machine-3" },
];

const statusOptions = [
  { label: "Available", value: "Available" },
  { label: "Unavailable", value: "Unavailable" },
];

export function EditServiceClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedQuery(preloadedService);
  const router = useRouter();
  const deleteService = useMutation(api.services.mutate.deleteService);
  const [isScrolled, setIsScrolled] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [samplesUploading, setSamplesUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasUploadsInProgress = thumbnailUploading || samplesUploading;

  const handleThumbnailUploading = useCallback(
    (isUploading: boolean) => setThumbnailUploading(isUploading),
    [],
  );
  const handleSamplesUploading = useCallback(
    (isUploading: boolean) => setSamplesUploading(isUploading),
    [],
  );

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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Snapshot the service's initial storage IDs once on mount so we can diff
  // them against the form state at submit time.
  const [originalImages] = useState<string[]>(() => service?.images ?? []);
  const [originalSamples] = useState<string[]>(() => service?.samples ?? []);

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
      regularPrice: service?.regularPrice ?? 0,
      upPrice: service?.upPrice ?? 0,
      unitPrice: service?.unitPrice ?? "",
      status: (service?.status ??
        "Available") as AddServiceFormValues["status"],
      images: (service?.images ?? []) as string[],
      samples: (service?.samples ?? []) as string[],
      requirements:
        service?.requirements && service.requirements.length > 0
          ? service.requirements
          : [""],
    },
    onSubmit: async ({ value }) => {
      if (!service) return;
      setSubmitError(null);

      try {
        // 1. Update all non-file fields.
        await updateService({
          service: service._id as Id<"services">,
          name: value.name,
          description: value.description,
          regularPrice: value.regularPrice,
          upPrice: value.upPrice,
          unitPrice: value.unitPrice,
          status: value.status,
          requirements: value.requirements.filter((r) => r.trim() !== ""),
        });

        // 2. Diff images and call dedicated mutations.
        const originalImageSet = new Set(originalImages);
        const newImageSet = new Set(value.images);

        const imagesToRemove = originalImages.filter(
          (id) => !newImageSet.has(id),
        );
        const imagesToAdd = value.images.filter(
          (id) => !originalImageSet.has(id),
        );

        await Promise.all([
          ...imagesToRemove.map((image) =>
            deleteImageFromService({
              service: service._id as Id<"services">,
              image: image as Id<"_storage">,
            }),
          ),
          ...imagesToAdd.map((image) =>
            addImageToService({
              service: service._id as Id<"services">,
              image: image as Id<"_storage">,
            }),
          ),
        ]);

        // 3. Diff samples and call dedicated mutations.
        const originalSampleSet = new Set(originalSamples);
        const newSampleSet = new Set(value.samples);

        const samplesToRemove = originalSamples.filter(
          (id) => !newSampleSet.has(id),
        );
        const samplesToAdd = value.samples.filter(
          (id) => !originalSampleSet.has(id),
        );

        await Promise.all([
          ...samplesToRemove.map((sample) =>
            deleteSampleFromService({
              service: service._id as Id<"services">,
              sample: sample as Id<"_storage">,
            }),
          ),
          ...samplesToAdd.map((sample) =>
            addSampleToService({
              service: service._id as Id<"services">,
              sample: sample as Id<"_storage">,
            }),
          ),
        ]);

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
    setIsDeleting(true);
    try {
      await deleteService({
        service: service._id as Id<"services">,
      });
      toast.promise<{ name: string }>(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ name: service.name }), 1000),
          ),
        {
          loading: "Deleting service...",
          success: (data) => `Service "${data.name}" deleted successfully!`,
          error: "Failed to delete service. Please try again.",
        },
      );
      router.push("/dashboard/services");
    } catch {
      setIsDeleting(false);
    }
  };

  // Guard against the service being deleted while the user is on this page.
  if (service === null) {
    return (
      <main className="container mx-auto max-w-6xl p-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/services">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-gray-200 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground text-center py-10">
          This service no longer exists.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl p-10">
      {/* Sticky header */}
      <header
        className={`sticky top-0 z-10 flex items-center justify-between mb-8 bg-white pb-4 ${
          isScrolled ? "border-b border-gray-200" : "border-b-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/services/`}>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-gray-200 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit {service.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {submitError && (
            <p className="text-sm text-red-500 max-w-xs text-right">
              {submitError}
            </p>
          )}
          <ActionDialog
            onConfirm={handleDeleteService}
            title="Delete Service?"
            description="Are you sure you want to delete this service? This action cannot be undone."
            baseActionText="Remove"
            confirmButtonText="Confirm Delete"
            className="bg-red-500 text-white hover:bg-red-600 hover:text-white px-6 font-medium rounded-lg"
          />

          <ActionDialog
            onConfirm={() => {
              form.reset();
              setSubmitError(null);
            }}
            title="Discard Changes?"
            description="Are you sure you want to discard all changes?"
            baseActionText="Discard"
            confirmButtonText="Confirm"
            className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="button"
                className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg"
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
      </header>

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
                accept="image/png, image/jpeg, image/jpg"
                value={initialUploadedSamples}
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
                  accept="image/png, image/jpeg, image/jpg"
                  value={initialUploadedImages}
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

          <MachineSelectForm options={machineOptions} />

          <form.Field
            name="status"
            children={(field) => (
              <SelectForm
                title="Status"
                options={statusOptions}
                value={field.state.value}
                onChange={(val) =>
                  field.handleChange(val as AddServiceFormValues["status"])
                }
              />
            )}
          />
        </div>
      </div>
    </main>
  );
}
