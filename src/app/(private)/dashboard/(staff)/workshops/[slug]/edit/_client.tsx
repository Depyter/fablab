"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/services/forms/service-form";
import { useRouter } from "next/navigation";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { useMutation, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { type AddServiceFormValues } from "@/types/add-service";
import type { UploadedFile } from "@/components/file-upload/types";
import { ActionDialog } from "@/components/action-dialog";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { ServiceStatus, type ServiceStatusType } from "@convex/constants";

const isServiceStatus = (value: unknown): value is ServiceStatusType =>
  typeof value === "string" &&
  Object.values(ServiceStatus).includes(value as ServiceStatusType);

export function EditWorkshopClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedAuthQuery(preloadedService);
  const router = useRouter();
  const updateService = useMutation(api.services.mutate.updateService);
  const deleteService = useMutation(api.services.mutate.deleteService);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (service === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">This workshop no longer exists.</p>
      </div>
    );
  }

  if (service.serviceCategory.type !== "WORKSHOP") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">This is not a workshop service.</p>
      </div>
    );
  }

  const initialImages: UploadedFile[] = (service.images || []).map(
    (id, index) => ({
      storageId: id,
      fileName: `Thumbnail ${index + 1}`,
      fileType: "image/jpeg",
      fileSize: 0,
      uploadedAt: new Date(),
      url: service.imageUrls?.[index] ?? undefined,
    }),
  );

  const initialSamples: UploadedFile[] = (service.samples || []).map(
    (id, index) => ({
      storageId: id,
      fileName: `Sample ${index + 1}`,
      fileType: "image/jpeg",
      fileSize: 0,
      uploadedAt: new Date(),
      url: service.sampleUrls?.[index] ?? undefined,
    }),
  );

  const initialValues: AddServiceFormValues = {
    name: service.name,
    description: service.description,
    serviceCategory: "WORKSHOP",
    pricing: {
      type: "FIXED" as const,
      amount: service.serviceCategory.amount,
      variants: (service.serviceCategory.variants ?? []) as Array<{
        name: string;
        amount: number;
      }>,
    },
    status: isServiceStatus(service.status)
      ? service.status
      : ServiceStatus.AVAILABLE,
    images: service.images as string[],
    samples: service.samples as string[],
    requirements:
      service.requirements && service.requirements.length > 0
        ? service.requirements
        : [""],
    fileTypes: service.fileTypes as string[],
    resources: [],
    materials: [],
    availableDays: [],
  };

  const handleDeleteService = async () => {
    if (!service) return;
    try {
      const deletePromise = deleteService({
        service: service._id as Id<"services">,
      });
      toast.promise(deletePromise, {
        loading: "Deleting workshop...",
        success: `Workshop "${service.name}" deleted successfully!`,
        error: "Failed to delete workshop.",
      });
      await deletePromise;
      router.push("/dashboard/workshops");
    } catch {
      // handled by toast
    }
  };

  const handleSubmit = async (value: AddServiceFormValues) => {
    setSubmitError(null);
    try {
      await updateService({
        service: service._id as Id<"services">,
        name: value.name,
        description: value.description,
        serviceCategory: {
          type: "WORKSHOP",
          amount: value.pricing.type === "FIXED" ? value.pricing.amount : 0,
          variants:
            value.pricing.type === "FIXED" && value.pricing.variants.length > 0
              ? value.pricing.variants
              : undefined,
        },
        status: value.status,
        requirements: value.requirements.filter((r) => r.trim() !== ""),
        fileTypes: value.fileTypes,
        resources: value.resources as Id<"resources">[],
        images: value.images as Id<"_storage">[],
        samples: value.samples as Id<"_storage">[],
      });

      toast.success("Workshop updated successfully!");
      router.push("/dashboard/workshops");
      return true;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to update workshop.";
      setSubmitError(message);
      toast.error(message);
      return false;
    }
  };

  return (
    <>
      <ServiceForm
        title={`Edit ${service.name}`}
        initialValues={initialValues}
        initialImages={initialImages}
        initialSamples={initialSamples}
        onSubmit={handleSubmit}
        onDiscard={() => router.push("/dashboard/workshops")}
        submitError={submitError}
        mode="WORKSHOP"
        backHref="/dashboard/workshops"
      />
      <div className="container mx-auto max-w-6xl px-10 pb-10 -mt-8">
        <div className="mt-12 rounded-lg border border-destructive bg-destructive/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">
              Once you delete a workshop, there is no going back. Please be
              certain.
            </p>
          </div>
          <ActionDialog
            onConfirm={handleDeleteService}
            title="Delete Workshop?"
            description="This action cannot be undone. This will permanently delete the workshop and all its assets."
            baseActionText="Delete Workshop"
            confirmButtonText="Delete"
            className="bg-destructive text-white hover:bg-destructive/90"
          />
        </div>
      </div>
    </>
  );
}
