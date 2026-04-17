"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/services/forms/service-form";
import { useRouter } from "next/navigation";
import { useMutation, usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AddServiceFormValues } from "@/types/add-service";
import type { UploadedFile } from "@/components/file-upload/types";
import { ActionDialog } from "@/components/action-dialog";
import { toast } from "sonner";

export function EditServiceClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedQuery(preloadedService);
  const router = useRouter();
  const updateService = useMutation(api.services.mutate.updateService);
  const deleteService = useMutation(api.services.mutate.deleteService);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (service === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">This service no longer exists.</p>
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
    serviceCategory: service.serviceCategory.type as "WORKSHOP" | "FABRICATION",
    pricing:
      service.pricing.type === "FIXED"
        ? {
            type: "FIXED" as const,
            amount: service.pricing.amount,
            variants: (service.pricing.variants ?? []) as Array<{
              name: string;
              amount: number;
            }>,
          }
        : service.pricing.type === "PER_UNIT"
          ? {
              type: "PER_UNIT" as const,
              setupFee: service.pricing.setupFee,
              unitName: service.pricing.unitName,
              ratePerUnit: service.pricing.ratePerUnit,
              variants: (service.pricing.variants ?? []) as Array<{
                name: string;
                setupFee: number;
                ratePerUnit: number;
              }>,
            }
          : {
              type: "COMPOSITE" as const,
              setupFee: service.pricing.setupFee,
              unitName: service.pricing.unitName,
              timeRate: service.pricing.timeRate,
              variants: (service.pricing.variants ?? []) as Array<{
                name: string;
                setupFee: number;
                timeRate: number;
              }>,
            },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: service.status as any,
    images: service.images as string[],
    samples: service.samples as string[],
    requirements:
      service.requirements && service.requirements.length > 0
        ? service.requirements
        : [""],
    fileTypes: service.fileTypes as string[],
    resources: (service.resources ?? []) as string[],
    materials:
      service.serviceCategory.type === "FABRICATION"
        ? ((service.serviceCategory.materials ?? []) as string[])
        : [],
    availableDays:
      service.serviceCategory.type === "FABRICATION"
        ? (service.serviceCategory.availableDays ?? [])
        : [],
    schedules:
      service.serviceCategory.type === "WORKSHOP"
        ? service.serviceCategory.schedules
        : [],
  };

  const handleSubmit = async (value: AddServiceFormValues) => {
    setSubmitError(null);
    try {
      const pricing =
        value.pricing.type === "FIXED"
          ? {
              type: "FIXED" as const,
              amount: value.pricing.amount,
              variants:
                value.pricing.variants.length > 0
                  ? value.pricing.variants
                  : undefined,
            }
          : value.pricing.type === "PER_UNIT"
            ? {
                type: "PER_UNIT" as const,
                setupFee: value.pricing.setupFee,
                unitName: value.pricing.unitName,
                ratePerUnit: value.pricing.ratePerUnit,
                variants:
                  value.pricing.variants.length > 0
                    ? value.pricing.variants
                    : undefined,
              }
            : {
                type: "COMPOSITE" as const,
                setupFee: value.pricing.setupFee,
                unitName: value.pricing.unitName,
                timeRate: value.pricing.timeRate,
                variants:
                  value.pricing.variants.length > 0
                    ? value.pricing.variants
                    : undefined,
              };

      await updateService({
        service: service._id as Id<"services">,
        name: value.name,
        description: value.description,
        serviceCategory:
          value.serviceCategory === "WORKSHOP"
            ? {
                type: "WORKSHOP",
                schedules: value.schedules ?? [],
              }
            : {
                type: "FABRICATION",
                availableDays: value.availableDays,
                materials: value.materials as Id<"materials">[],
              },
        //TODO FIX AS ANY
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pricing: pricing as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: value.status as any,
        requirements: value.requirements.filter((r) => r.trim() !== ""),
        fileTypes: value.fileTypes,
        resources: value.resources as Id<"resources">[],
      });

      toast.success("Service updated successfully!");
      setTimeout(() => router.push("/dashboard/services"), 1000);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to update service. Please try again.",
      );
      toast.error("Failed to update service. Please try again.");
      throw error;
    }
  };

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

  return (
    <>
      <ServiceForm
        title={`Edit ${service.name}`}
        initialValues={initialValues}
        initialImages={initialImages}
        initialSamples={initialSamples}
        onSubmit={handleSubmit}
        onDiscard={() => {
          router.push("/dashboard/services");
        }}
        submitError={submitError}
      />
      <div className="container mx-auto max-w-6xl px-10 pb-10 -mt-8">
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
            description="This action cannot be undone. This will permanently delete the service and all its assets."
            baseActionText="Delete Service"
            confirmButtonText="Delete"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          />
        </div>
      </div>
    </>
  );
}
