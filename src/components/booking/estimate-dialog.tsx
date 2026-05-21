import { Card } from "@/components/ui/card";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { FieldSeparator } from "@/components/ui/field";
import { ProjectAttachments } from "@/components/projects/project-attachments";
import type { UploadedFile } from "../file-upload/types";
import {
  derivePricingFromSchema,
  getDurationMinutesFromTimeRange,
  getPricingVariantKey,
  type ServicePricing,
} from "@/lib/project-pricing";
import { formatLabClockTime, formatLabDateNumeric } from "@/lib/lab-time";
import type {
  FulfillmentModeType,
  ProjectMaterialType,
} from "@convex/constants";

export type BookingFormValues = {
  serviceType: FulfillmentModeType;
  name: string;
  description: string;
  notes: string;
  material: ProjectMaterialType;
  requestedMaterialIds?: string[];
  requestedResourceIds?: string[];
  pricing: string;
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

  let materialNames: string[] = [];
  if (
    data.material === "buy-from-lab" &&
    data.requestedMaterialIds &&
    data.requestedMaterialIds.length > 0 &&
    serviceMaterials
  ) {
    materialNames = data.requestedMaterialIds
      .map((id) => serviceMaterials.find((m) => m._id === id)?.name)
      .filter((n): n is string => !!n);
  }

  const pricing = derivePricingFromSchema({
    servicePricing,
    pricingVariant: data.pricing,
    serviceType: data.serviceType,
    bookingDurationMinutes: durationMins,
    materialCost: 0,
  });
  const selectedVariant = getPricingVariantKey(data.pricing);
  const pricingType = servicePricing?.type ?? "WORKSHOP";
  const isTimeBased = pricingType === "FABRICATION";
  const isBuyFromLab = data.material === "buy-from-lab";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DialogHeader className="shrink-0 border-black px-2 pb-4 sm:px-0">
        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
          Review & Estimate
        </DialogTitle>
        <DialogDescription className="max-w-xl text-sm font-bold text-black/60">
          Please review all details before submitting.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-4 flex-1 overflow-y-auto px-4 py-1 no-scrollbar">
        <Card className="rounded-lg border-2 border-black bg-background py-4">
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
            <div className="border-b-4 border-black px-4 pb-4 pt-4">
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Project Information
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                    Date
                  </p>
                  <p className="text-sm font-bold text-black">
                    {data.dateTime.date
                      ? formatLabDateNumeric(data.dateTime.date)
                      : "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                    Time
                  </p>
                  <p className="text-sm font-bold text-black">
                    {formatLabClockTime(data.dateTime.startTime)} -{" "}
                    {formatLabClockTime(data.dateTime.endTime)}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                    Project Name
                  </p>
                  <p className="text-sm font-bold text-black">{data.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                    Material
                  </p>
                  <p className="text-sm font-bold text-black">
                    {data.material === "provide-own"
                      ? "Provide Materials"
                      : "Buy From Fablab"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                    Description
                  </p>
                  <p className="text-sm font-bold text-black">
                    {data.description}
                  </p>
                </div>
                {data.notes && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                      Notes
                    </p>
                    <p className="text-sm font-bold text-black">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Files */}
            <div className="border-b-4 border-black px-4 pb-4 pt-4">
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
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
            <div className="border-b-4 border-black bg-fab-amber/10 px-4 pb-4 pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-black">
                  Pricing Estimate
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedVariant && (
                    <span className="inline-flex items-center border-2 border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                      {selectedVariant}
                    </span>
                  )}
                  <span className="inline-flex items-center border-2 border-black bg-fab-teal/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-fab-teal">
                    {pricingType.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {pricingType === "WORKSHOP" && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                      Amount
                    </span>
                    <span className="text-sm font-bold text-black">
                      ₱{pricing.setupFee.toFixed(2)}
                    </span>
                  </div>
                )}

                {isTimeBased && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                        Setup Fee
                      </span>
                      <span className="text-sm font-bold text-black">
                        ₱{pricing.setupFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                        Duration ({pricing.unitName}s)
                      </span>
                      <span className="text-sm font-bold text-black">
                        {pricing.duration.toFixed(2)} {pricing.unitName}s
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                        Rate / {pricing.unitName}
                      </span>
                      <span className="text-sm font-bold text-black">
                        ₱{pricing.rate.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                        Time Cost
                      </span>
                      <span className="text-sm font-bold text-black">
                        ₱{pricing.timeCost.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {isBuyFromLab && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                        Materials
                      </span>
                      <span className="text-sm font-bold text-black text-right">
                        {materialNames.length > 0
                          ? materialNames.join(", ")
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                        Material Cost
                      </span>
                      <span className="text-sm font-bold text-black">N/A</span>
                    </div>
                  </>
                )}

                <FieldSeparator className="my-1" />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                    Estimated Total
                  </span>
                  <span className="text-xl font-black text-fab-teal">
                    ₱{pricing.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs font-bold text-black/60">
                  Final price may vary based on actual production time and
                  materials used.
                </p>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start bg-fab-amber/20 px-4 py-4">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 h-4 w-4 border-2 border-black text-fab-magenta accent-fab-magenta"
                onChange={handleCheckboxChange}
              />
              <label
                htmlFor="terms"
                className="ml-3 text-xs font-bold text-black/60 leading-relaxed"
              >
                I understand that this is a booking request and requires admin
                approval. I agree to the{" "}
                <a
                  href="#"
                  className="text-fab-teal underline hover:text-black"
                >
                  terms and conditions
                </a>{" "}
                and the{" "}
                <a
                  href="#"
                  className="text-fab-teal underline hover:text-black"
                >
                  cancellation policy
                </a>
                .
              </label>
            </div>
          </div>
        </Card>
      </div>

      <div className="shrink-0 mt-4 flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 sm:w-auto"
        >
          <ChevronLeft className="size-4" strokeWidth={3} />
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting || canSubmit === false || !isChecked}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 border-2 border-black bg-fab-magenta px-4 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? "Submitting..." : "Submit Project Request"}
        </button>
      </div>
    </div>
  );
}
