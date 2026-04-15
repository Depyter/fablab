import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState } from "react";

import { Card } from "@/components/ui/card";

import { FieldSeparator } from "@/components/ui/field";
import { MediaGallery } from "../chat/media-gallery";
import { UploadedFile } from "../file-upload/types";

export type BookingFormValues = {
  serviceType: "self-service" | "full-service";
  name: string;
  description: string;
  notes: string;
  material: string;
  requestedMaterialId?: string;
  pricing: "normal" | "UP";
  dateTime: {
    date: Date | undefined;
    startTime: string;
    endTime: string;
  };
  files: UploadedFile[];
};

interface EstimateProjectDetailsProps {
  serviceName: string;
  data: BookingFormValues;
  servicePricing?:
    | { type: "FIXED"; amount: number; upAmount?: number }
    | {
        type: "PER_UNIT";
        baseFee: number;
        upBaseFee?: number;
        unitName: string;
        ratePerUnit: number;
        upRatePerUnit?: number;
      }
    | {
        type: "COMPOSITE";
        baseFee: number;
        upBaseFee?: number;
        unitName: string;
        timeRate: number;
        upTimeRate?: number;
      };
  serviceMaterials?: Array<{
    _id: string;
    name: string;
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
  let durationMins = 0;
  if (data.dateTime.startTime && data.dateTime.endTime) {
    const [startH, startM] = data.dateTime.startTime.split(":").map(Number);
    const [endH, endM] = data.dateTime.endTime.split(":").map(Number);
    durationMins = endH * 60 + endM - (startH * 60 + startM);
  }
  const durationHours = durationMins / 60;

  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
  };

  let basePrice = 0;
  let durationCost = 0;
  let materialCost = 0;
  let unitName = "hour";

  const isUp = data.pricing === "UP";

  if (servicePricing) {
    if (servicePricing.type === "FIXED") {
      basePrice =
        isUp && servicePricing.upAmount !== undefined
          ? servicePricing.upAmount
          : servicePricing.amount;
    } else if (servicePricing.type === "PER_UNIT") {
      basePrice =
        isUp && servicePricing.upBaseFee !== undefined
          ? servicePricing.upBaseFee
          : servicePricing.baseFee;
      const rate =
        isUp && servicePricing.upRatePerUnit !== undefined
          ? servicePricing.upRatePerUnit
          : servicePricing.ratePerUnit;
      unitName = servicePricing.unitName;

      if (unitName === "hour" || unitName === "hr") {
        durationCost = durationHours * rate;
      } else if (unitName === "minute" || unitName === "min") {
        durationCost = durationMins * rate;
      }
    } else if (servicePricing.type === "COMPOSITE") {
      basePrice =
        isUp && servicePricing.upBaseFee !== undefined
          ? servicePricing.upBaseFee
          : servicePricing.baseFee;
      const timeRate =
        isUp && servicePricing.upTimeRate !== undefined
          ? servicePricing.upTimeRate
          : servicePricing.timeRate;
      unitName = servicePricing.unitName;

      if (unitName === "hour" || unitName === "hr") {
        durationCost = durationHours * timeRate;
      } else if (unitName === "minute" || unitName === "min") {
        durationCost = durationMins * timeRate;
      } else {
        durationCost = durationHours * timeRate;
      }
    }
  }

  if (
    data.material === "buy-from-lab" &&
    data.requestedMaterialId &&
    serviceMaterials
  ) {
    const mat = serviceMaterials.find(
      (m) => m._id === data.requestedMaterialId,
    );
    if (mat) {
      materialCost = mat.pricePerUnit || mat.costPerUnit || 0;
    }
  }

  const estimatedTotal = basePrice + durationCost + materialCost;

  return (
    <div className="w-full">
      <DialogHeader>
        <DialogTitle className="text-2xl font-extrabold">
          Review & Estimate Project
        </DialogTitle>
        <DialogDescription>
          Please review all details before submitting.
        </DialogDescription>
      </DialogHeader>

      <FieldSeparator className="mt-4 mb-2" />

      <div className="-mx-4 no-scrollbar max-h-[70vh] overflow-y-auto px-4 py-4">
        <Card className="rounded-lg">
          <div className=" divide-y">
            {/* Service Summary */}
            <div className="p-6 -mt-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                Service Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Service</p>
                  <p className="font-medium">{serviceName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium capitalize">
                    {data.serviceType?.replace("-", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Project Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
                    {data.dateTime.startTime} - {data.dateTime.endTime}
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Project Name</p>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Uploaded Files
              </h3>
              {data.files.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {data.files.map((f, i) => (
                    <MediaGallery
                      key={i}
                      mediaFiles={[
                        {
                          fileUrl: f.url || "",
                          fileType: f.fileType,
                          originalName: f.fileName,
                        },
                      ]}
                      isCurrentUser={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No files uploaded.</p>
              )}
            </div>

            {/* Pricing */}
            <div className="p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">
                  Pricing Estimate
                </h3>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-chart-6/10 text-chart-6 uppercase tracking-wider">
                  {isUp ? "UP Rate" : "Normal Rate"}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price</span>
                  <span className="font-medium">₱{basePrice.toFixed(2)}</span>
                </div>
                {durationCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Duration ({durationMins} mins)
                    </span>
                    <span className="font-medium">
                      ₱{durationCost.toFixed(2)}
                    </span>
                  </div>
                )}
                {materialCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Lab Material (Est. 1 unit)
                    </span>
                    <span className="font-medium">
                      ₱{materialCost.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold">Estimated Total</span>
                  <span className="font-semibold text-lg text-chart-6">
                    ₱{estimatedTotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final price may vary based on actual production time and
                  materials used.
                </p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start p-6">
            <input
              type="checkbox"
              id="terms"
              required
              className="mt-1 h-4 w-4 text-chart-6 rounded"
              onChange={handleCheckboxChange}
            />
            <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
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
        </Card>
      </div>

      <FieldSeparator className="mb-4" />
      <DialogFooter>
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
      </DialogFooter>
    </div>
  );
}
