import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { FieldSeparator } from "@/components/ui/field";
import { ProjectAttachments } from "@/components/projects/project-attachments";
import { UploadedFile } from "../file-upload/types";
import {
  derivePricingFromSchema,
  getDurationMinutesFromTimeRange,
  getPricingVariantKey,
  type ServicePricing,
} from "@/lib/project-pricing";

export type BookingFormValues = {
  serviceType: "self-service" | "full-service";
  name: string;
  description: string;
  notes: string;
  material: string;
  requestedMaterialId?: string;
  pricing: string; // variant name, e.g. "Default", "UP", "Senior"
  dateTime: {
    date: Date | undefined;
    startTime: string;
    endTime: string;
    originalDate?: number;
    originalStartTime?: number;
    originalEndTime?: number;
  };
  files: UploadedFile[];
};

interface EstimateProjectDetailsProps {
  serviceName: string;
  data: BookingFormValues;
  servicePricing?: ServicePricing;
  serviceMaterials?: Array<{
    _id: string;
    name: string;
    unit?: string;
    pricePerUnit?: number;
    costPerUnit?: number;
  }>;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  onBack: () => void;
}

export function EstimateProjectDetails({
  serviceName,
  data,
  servicePricing,
  serviceMaterials,
  isSubmitting,
  canSubmit,
  onBack,
}: EstimateProjectDetailsProps) {
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
  };

  const durationMins = getDurationMinutesFromTimeRange(
    data.dateTime.startTime,
    data.dateTime.endTime,
  );

  let materialName = "";
  if (
    data.material === "buy-from-lab" &&
    data.requestedMaterialId &&
    serviceMaterials
  ) {
    const mat = serviceMaterials.find(
      (m) => m._id === data.requestedMaterialId,
    );
    if (mat) {
      materialName = mat.name;
    }
  }

  const pricing = derivePricingFromSchema({
    servicePricing,
    pricingVariant: data.pricing,
    serviceType: data.serviceType,
    bookingDurationMinutes: durationMins,
    materialCost: 0,
  });
  const selectedVariant = getPricingVariantKey(data.pricing);
  const pricingType = servicePricing?.type ?? "FIXED";
  const isTimeBased = pricingType === "PER_UNIT" || pricingType === "COMPOSITE";
  const isBuyFromLab = data.material === "buy-from-lab";

  const formatTime12Hour = (time24: string) => {
    const [hour, minute] = time24.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <DialogHeader className="shrink-0 pb-4">
        <DialogTitle className="text-2xl font-extrabold">
          Review & Estimate Project
        </DialogTitle>
        <DialogDescription className="text-sm">
          Please review all details before submitting.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-4 flex-1 overflow-y-auto px-4 py-1 no-scrollbar">
        <Card className="rounded-lg py-4">
          <div className="divide-y">
            {/* Service Summary */}
            <div className="px-4 pb-4">
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Service Details
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-600 text-sm">Service</p>
                  <p className="font-medium text-sm">{serviceName}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Type</p>
                  <p className="font-medium text-sm capitalize">
                    {data.serviceType?.replace("-", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Project Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium">
                    {data.dateTime.date
                      ? data.dateTime.date.toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Time</p>
                  <p className="font-medium">
                    {formatTime12Hour(data.dateTime.startTime)} -{" "}
                    {formatTime12Hour(data.dateTime.endTime)}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Project Name</p>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-600">Material</p>
                    <p className="font-medium">
                      {data.material === "provide-own"
                        ? "Provide Materials"
                        : "Buy From Fablab"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">Description</p>
                  <p className="font-medium">{data.description}</p>
                </div>
                {data.notes && (
                  <div>
                    <p className="text-gray-600">Notes</p>
                    <p className="font-medium">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Files */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Uploaded Files
              </h3>
              <ProjectAttachments
                files={data.files.map((f) => ({
                  url: f.url || "",
                  type: f.fileType,
                  originalName: f.fileName,
                }))}
              />
            </div>

            {/* Pricing */}
            <div className="p-4 bg-gray-50">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pricing Estimate
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedVariant && (
                    <span className="rounded-full bg-chart-4/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-chart-4">
                      {selectedVariant}
                    </span>
                  )}
                  <span className="rounded-full bg-chart-6/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-chart-6">
                    {pricingType.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {pricingType === "FIXED" && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                      Amount
                    </span>
                    <span className="text-[13px] font-medium text-gray-900">
                      ₱{pricing.setupFee.toFixed(2)}
                    </span>
                  </div>
                )}

                {isTimeBased && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Setup Fee
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">
                        ₱{pricing.setupFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Duration ({pricing.unitName}s)
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">
                        {pricing.duration.toFixed(2)} {pricing.unitName}s
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Rate / {pricing.unitName}
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">
                        ₱{pricing.rate.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Time Cost
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">
                        ₱{pricing.timeCost.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {isBuyFromLab && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Material Used
                        {materialName && (
                          <span className="ml-1 normal-case text-[9px] font-normal tracking-normal text-gray-500">
                            ({materialName})
                          </span>
                        )}
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">
                        N/A
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Material Cost
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">
                        N/A
                      </span>
                    </div>
                  </>
                )}

                <FieldSeparator className="my-1" />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    Estimated Total
                  </span>
                  <span className="text-xl font-extrabold text-chart-6">
                    ₱{pricing.total.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Final price may vary based on actual production time and
                  materials used.
                </p>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start p-4 bg-gray-50/50">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 h-4 w-4 text-chart-6 rounded"
                onChange={handleCheckboxChange}
              />
              <label
                htmlFor="terms"
                className="ml-3 text-sm text-gray-600 leading-relaxed"
              >
                I understand that this is a booking request and requires admin
                approval. I agree to the{" "}
                <a href="#" className="text-chart-6 hover:underline">
                  terms and conditions
                </a>{" "}
                and the{" "}
                <a href="#" className="text-chart-6 hover:underline">
                  cancellation policy
                </a>
                .
              </label>
            </div>
          </div>
        </Card>
      </div>

      <div className="shrink-0 pt-4 border-t mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="rounded-lg"
          disabled={isSubmitting || canSubmit === false || !isChecked}
        >
          {isSubmitting ? "Submitting..." : "Submit Project Request"}
        </Button>
      </div>
    </div>
  );
}
