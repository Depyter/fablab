"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/services/forms/service-form";
import { useRouter } from "next/navigation";
import { useMutation, usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AddServiceFormValues } from "@/types/add-service";
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

  const initialValues: AddServiceFormValues = {
    name: service.name,
    description: service.description,
    serviceCategory: service.serviceCategory.type as "WORKSHOP" | "FABRICATION",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing: service.pricing as any,
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
    date:
      service.serviceCategory.type === "WORKSHOP"
        ? service.serviceCategory.date
        : undefined,
    timeSlots:
      service.serviceCategory.type === "WORKSHOP"
        ? service.serviceCategory.timeSlots
        : [],
  };

  const handleSubmit = async (value: AddServiceFormValues) => {
    setSubmitError(null);
    try {
      const getVal = (key: string) => {
        const entry = Object.entries(value.pricing).find(([k]) => k === key);
        return entry && entry[1] !== undefined && entry[1] !== ""
          ? Number(entry[1])
          : undefined;
      };

      const upAmount = getVal("upAmount");
      const upBaseFee = getVal("upBaseFee");
      const upRatePerUnit = getVal("upRatePerUnit");
      const upTimeRate = getVal("upTimeRate");

      const pricing =
        value.pricing.type === "FIXED"
          ? {
              type: "FIXED" as const,
              amount: value.pricing.amount,
              variants:
                upAmount !== undefined
                  ? [{ name: "UP", amount: upAmount }]
                  : undefined,
            }
          : value.pricing.type === "PER_UNIT"
            ? {
                type: "PER_UNIT" as const,
                baseFee: value.pricing.baseFee,
                unitName: value.pricing.unitName,
                ratePerUnit: value.pricing.ratePerUnit,
                variants:
                  upBaseFee !== undefined || upRatePerUnit !== undefined
                    ? [
                        {
                          name: "UP",
                          baseFee: upBaseFee ?? value.pricing.baseFee,
                          ratePerUnit:
                            upRatePerUnit ?? value.pricing.ratePerUnit,
                        },
                      ]
                    : undefined,
              }
            : {
                type: "COMPOSITE" as const,
                baseFee: value.pricing.baseFee,
                unitName: value.pricing.unitName,
                timeRate: value.pricing.timeRate,
                variants:
                  upBaseFee !== undefined || upTimeRate !== undefined
                    ? [
                        {
                          name: "UP",
                          baseFee: upBaseFee ?? value.pricing.baseFee,
                          timeRate: upTimeRate ?? value.pricing.timeRate,
                        },
                      ]
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
                date: value.date as number,
                timeSlots: value.timeSlots ?? [],
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
