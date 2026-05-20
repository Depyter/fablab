"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  toMutationWorkshopSchedules,
  type AddServiceFormValues,
} from "@/types/add-service";
import { toast } from "sonner";
import { ServiceForm } from "@/components/services/forms/service-form";

const WORKSHOP_INITIAL_VALUES: AddServiceFormValues = {
  name: "",
  description: "",
  serviceCategory: "WORKSHOP",
  pricing: { type: "FIXED" as const, amount: 0, variants: [] },
  status: "Available",
  images: [],
  samples: [],
  requirements: [""],
  fileTypes: [],
  resources: [],
  materials: [],
  availableDays: [],
  schedules: [],
};

export default function AddWorkshopPage() {
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
          type: "WORKSHOP",
          schedules: toMutationWorkshopSchedules(value.schedules),
          amount: value.pricing.type === "FIXED" ? value.pricing.amount : 0,
          variants:
            value.pricing.type === "FIXED" && value.pricing.variants.length > 0
              ? value.pricing.variants
              : undefined,
        },
      });

      toast.success("Workshop added!");
      router.push("/dashboard/workshops");
      return true;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to add workshop.";
      setSubmitError(message);
      toast.error(message);
      return false;
    }
  };

  const handleDiscard = async (formValues: AddServiceFormValues) => {
    const orphans = [
      ...(formValues.images as Id<"_storage">[]),
      ...(formValues.samples as Id<"_storage">[]),
    ];
    if (orphans.length > 0) {
      await deleteOrphanedFiles({ storageIds: orphans });
    }
    setSubmitError(null);
    router.push("/dashboard/workshops");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto">
        <ServiceForm
          title="Add New Workshop"
          initialValues={WORKSHOP_INITIAL_VALUES}
          onSubmit={handleSubmit}
          onDiscard={handleDiscard}
          submitError={submitError}
          mode="WORKSHOP"
          backHref="/dashboard/workshops"
        />
      </div>
    </div>
  );
}
