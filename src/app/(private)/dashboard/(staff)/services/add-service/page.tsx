"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { type AddServiceFormValues } from "@/types/add-service";
import { toast } from "sonner";
import { ServiceForm } from "@/components/services/forms/service-form";

const FABRICATION_INITIAL_VALUES: AddServiceFormValues = {
  name: "",
  description: "",
  serviceCategory: "FABRICATION",
  pricing: {
    type: "FABRICATION" as const,
    setupFee: 0,
    unitName: "hour",
    timeRate: 0,
    variants: [],
  },
  status: "Available",
  images: [],
  samples: [],
  requirements: [""],
  fileTypes: [],
  resources: [],
  materials: [],
  availableDays: [],
};

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
        serviceCategory: {
          type: "FABRICATION",
          availableDays: value.availableDays,
          materials: value.materials as Id<"materials">[],
          setupFee:
            value.pricing.type === "FABRICATION" ? value.pricing.setupFee : 0,
          unitName:
            value.pricing.type === "FABRICATION"
              ? value.pricing.unitName
              : ("hour" as const),
          timeRate:
            value.pricing.type === "FABRICATION" ? value.pricing.timeRate : 0,
          variants:
            value.pricing.type === "FABRICATION" &&
            value.pricing.variants.length > 0
              ? value.pricing.variants
              : undefined,
        },
      });

      toast.success("Fabrication service added successfully!");
      router.push("/dashboard/services");
      return true;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to add service.";
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
      title="Add Fabrication Service"
      initialValues={FABRICATION_INITIAL_VALUES}
      onSubmit={handleSubmit}
      onDiscard={handleDiscard}
      submitError={submitError}
      mode="FABRICATION"
    />
  );
}
