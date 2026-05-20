"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  defaultAddServiceValues,
  toMutationWorkshopSchedules,
  type AddServiceFormValues,
} from "@/types/add-service";
import { toast } from "sonner";
import { ServiceForm } from "@/components/services/forms/service-form";

export default function AddServicePage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addService = useMutation(api.services.mutate.addService);
  const deleteOrphanedFiles = useMutation(
    api.services.mutate.deleteOrphanedFiles,
  );

  const handleSubmit = async (value: AddServiceFormValues) => {
    setSubmitError(null);
    try {
      await addService({
        name: value.name,
        description: value.description,
        status: value.status,
        fileTypes: value.fileTypes,
        images: value.images as Id<"_storage">[],
        samples: value.samples as Id<"_storage">[],
        resources: value.resources as Id<"resources">[],
        requirements: value.requirements.filter((r) => r.trim() !== ""),
        serviceCategory:
          value.serviceCategory === "WORKSHOP"
            ? {
                type: "WORKSHOP",
                schedules: toMutationWorkshopSchedules(value.schedules),
                amount:
                  value.pricing.type === "FIXED" ? value.pricing.amount : 0,
                variants:
                  value.pricing.type === "FIXED" &&
                  value.pricing.variants.length > 0
                    ? value.pricing.variants
                    : undefined,
              }
            : {
                type: "FABRICATION",
                availableDays: value.availableDays,
                materials: value.materials as Id<"materials">[],
                setupFee:
                  value.pricing.type === "FABRICATION"
                    ? value.pricing.setupFee
                    : 0,
                unitName:
                  value.pricing.type === "FABRICATION"
                    ? value.pricing.unitName
                    : ("hour" as const),
                timeRate:
                  value.pricing.type === "FABRICATION"
                    ? value.pricing.timeRate
                    : 0,
                variants:
                  value.pricing.type === "FABRICATION" &&
                  value.pricing.variants.length > 0
                    ? value.pricing.variants
                    : undefined,
              },
      });

      toast.success("Service added successfully!");
      setTimeout(() => router.push("/dashboard/services"), 1000);
      return true;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to add service. Please try again.";
      setSubmitError(message);
      toast.error(message);
      return false;
    }
  };

  const handleDiscard = async (formValues: AddServiceFormValues) => {
    const { images, samples } = formValues;
    const orphans = [
      ...(images as Id<"_storage">[]),
      ...(samples as Id<"_storage">[]),
    ];
    if (orphans.length > 0) {
      await deleteOrphanedFiles({ storageIds: orphans });
    }
    setSubmitError(null);
    router.push("/dashboard/services");
  };

  return (
    <ServiceForm
      title="Add New Service"
      initialValues={defaultAddServiceValues}
      onSubmit={handleSubmit}
      onDiscard={handleDiscard}
      submitError={submitError}
    />
  );
}
