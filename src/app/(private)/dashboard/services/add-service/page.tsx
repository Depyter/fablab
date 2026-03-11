"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppForm } from "@/lib/form-context";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { GeneralInfoForm } from "@/components/services/forms/general-info-form";
import { PricingForm } from "@/components/services/forms/pricing-form";
import { RequirementsForm } from "@/components/services/forms/requirements-form";
import { SampleProjectsForm } from "@/components/services/forms/upload-sample-proj-form";
import { ThumbnailForm } from "@/components/services/forms/upload-thumbnail-form";
import { MachineSelectForm } from "@/components/services/forms/machine-select-form";
import { SelectForm } from "@/components/services/forms/select-form";
import {
  addServiceFormOpts,
  type AddServiceFormValues,
} from "@/types/add-service";

// sample select machine options
const machineOptions = [
  { label: "Machine 1", value: "machine-1" },
  { label: "Machine 2", value: "machine-2" },
  { label: "Machine 3", value: "machine-3" },
];

// status options aligned with the backend literals
const statusOptions = [
  { label: "Available", value: "Available" },
  { label: "Unavailable", value: "Unavailable" },
];

export default function AddServicePage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const addService = useMutation(api.services.mutate.addService);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const form = useAppForm({
    ...addServiceFormOpts,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await addService({
          name: value.name,
          description: value.description,
          regularPrice: value.regularPrice,
          upPrice: value.upPrice,
          unitPrice: value.unitPrice,
          status: value.status,
          images: value.images as Id<"_storage">[],
          samples: value.samples as Id<"_storage">[],
          requirements: value.requirements.filter((r) => r.trim() !== ""),
        });
        router.push("/dashboard/services");
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to add service. Please try again.",
        );
      }
    },
  });

  return (
    <main className="container mx-auto max-w-6xl p-10">
      {/* Top Navigation & Actions */}
      <header
        className={`sticky top-0 z-10 flex items-center justify-between mb-8 bg-white pb-4 ${
          isScrolled ? "border-b border-gray-200" : "border-b-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Link href="/dashboard/services">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-gray-200 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add New Service</h1>
        </div>
        <div className="flex items-center gap-3">
          {submitError && (
            <p className="text-sm text-red-500 max-w-xs text-right">
              {submitError}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
            onClick={() => {
              form.reset();
              setSubmitError(null);
            }}
          >
            Discard
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="button"
                className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg"
                disabled={!canSubmit || isSubmitting}
                onClick={() => form.handleSubmit()}
              >
                {isSubmitting ? "Saving..." : "Add Service"}
              </Button>
            )}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
        {/* Left Content */}
        <div className="lg:col-span-5 space-y-5">
          <GeneralInfoForm form={form} />
          <PricingForm form={form} />
          <RequirementsForm form={form} />
          <SampleProjectsForm form={form} />
        </div>

        {/* Right Content */}
        <div className="lg:col-span-3 space-y-4">
          <ThumbnailForm form={form} />
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
