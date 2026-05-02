"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  defaultAddServiceValues,
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
      const {
        availableDays,
        schedules,
        serviceCategory,
        materials,
        pricing,
        ...restValue
      } = value;

      await addService({
        ...restValue,
        serviceCategory:
          serviceCategory === "WORKSHOP"
            ? {
                type: "WORKSHOP",
                schedules: schedules ?? [],
                amount: pricing.type === "FIXED" ? pricing.amount : 0,
                variants:
                  pricing.type === "FIXED" && pricing.variants.length > 0
                    ? pricing.variants
                    : undefined,
              }
            : {
                type: "FABRICATION",
                availableDays,
                materials: materials as Id<"materials">[],
                setupFee: pricing.type === "FABRICATION" ? pricing.setupFee : 0,
                unitName:
                  pricing.type === "FABRICATION"
                    ? pricing.unitName
                    : ("hour" as const),
                timeRate: pricing.type === "FABRICATION" ? pricing.timeRate : 0,
                variants:
                  pricing.type === "FABRICATION" && pricing.variants.length > 0
                    ? pricing.variants
                    : undefined,
              },
        images: value.images as Id<"_storage">[],
        samples: value.samples as Id<"_storage">[],
        resources: value.resources as Id<"resources">[],
        requirements: value.requirements.filter((r) => r.trim() !== ""),
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
