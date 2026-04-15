"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
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

      const {
        availableDays,
        schedules,
        serviceCategory,
        materials,
        ...restValue
      } = value;

      await addService({
        ...restValue,
        serviceCategory:
          serviceCategory === "WORKSHOP"
            ? {
                type: "WORKSHOP",
                schedules: schedules ?? [],
              }
            : {
                type: "FABRICATION",
                availableDays: availableDays,
                materials: materials as Id<"materials">[],
              },
        images: value.images as Id<"_storage">[],
        samples: value.samples as Id<"_storage">[],
        resources: value.resources as Id<"resources">[],
        requirements: value.requirements.filter((r) => r.trim() !== ""),
        pricing:
          value.pricing.type === "FIXED"
            ? {
                type: "FIXED",
                amount: value.pricing.amount,
                variants:
                  upAmount !== undefined
                    ? [{ name: "UP", amount: upAmount }]
                    : undefined,
              }
            : value.pricing.type === "PER_UNIT"
              ? {
                  type: "PER_UNIT",
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
                  type: "COMPOSITE",
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
                },
      });
      toast.success("Service added successfully!");
      setTimeout(() => router.push("/dashboard/services"), 1000);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to add service. Please try again.",
      );
      toast.error("Failed to add service. Please try again.");
      throw error;
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
