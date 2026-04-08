"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldSeparator } from "@/components/ui/field";
import { ActionDialog } from "../action-dialog";

type EstimationValues = {
  basePrice: number;
  duration: number;
  durationRate: number;
  materialCost: number;
  estimatedMaterialUsed: string;
};

interface PricingEstimateCardProps {
  material: string;
  service?: {
    pricing:
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
          timeRatePerHour: number;
          upTimeRatePerHour?: number;
        };
    name?: string;
  };
  projectPricing?: "normal" | "UP" | "Special";
  resourceUsages?: Array<{
    startTime: number;
    endTime: number;
    materialsUsed?: Array<{ amountUsed: number; materialId: string }>;
  }>;
  initialValues?: Partial<EstimationValues>;
  onSave?: (values: EstimationValues) => void;
}

export function PricingEstimateCard({
  material,
  service,
  resourceUsages,
  initialValues,
  onSave,
  projectPricing = "normal",
}: PricingEstimateCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const defaultDurationMs =
    resourceUsages?.reduce((acc, u) => acc + (u.endTime - u.startTime), 0) || 0;

  let defaultDuration = 0;
  let unitName = "unit";
  let defaultRate = 0;
  let baseFee = 0;

  if (service?.pricing) {
    const isUp = projectPricing === "UP";
    if (service.pricing.type === "FIXED") {
      defaultDuration = 1;
      baseFee =
        isUp && service.pricing.upAmount !== undefined
          ? service.pricing.upAmount
          : service.pricing.amount;
    } else if (service.pricing.type === "PER_UNIT") {
      unitName = service.pricing.unitName;
      defaultRate =
        isUp && service.pricing.upRatePerUnit !== undefined
          ? service.pricing.upRatePerUnit
          : service.pricing.ratePerUnit;
      baseFee =
        isUp && service.pricing.upBaseFee !== undefined
          ? service.pricing.upBaseFee
          : service.pricing.baseFee;
      if (unitName === "min" || unitName === "minute") {
        defaultDuration = defaultDurationMs / (1000 * 60);
      } else if (unitName === "hr" || unitName === "hour") {
        defaultDuration = defaultDurationMs / (1000 * 60 * 60);
      } else {
        defaultDuration = 1;
      }
    } else if (service.pricing.type === "COMPOSITE") {
      unitName = "hour";
      defaultRate =
        isUp && service.pricing.upTimeRatePerHour !== undefined
          ? service.pricing.upTimeRatePerHour
          : service.pricing.timeRatePerHour;
      baseFee =
        isUp && service.pricing.upBaseFee !== undefined
          ? service.pricing.upBaseFee
          : service.pricing.baseFee;
      defaultDuration = defaultDurationMs / (1000 * 60 * 60);
    }
  }

  const defaultMaterialAmount =
    resourceUsages
      ?.find((u) => u.materialsUsed && u.materialsUsed.length > 0)
      ?.materialsUsed?.[0]?.amountUsed?.toString() || "0";
  const defaultMaterialType = "units";

  const [values, setValues] = useState<EstimationValues>({
    basePrice: initialValues?.basePrice ?? baseFee,
    duration: initialValues?.duration ?? defaultDuration,
    durationRate: initialValues?.durationRate ?? defaultRate,
    materialCost: initialValues?.materialCost ?? 0,
    estimatedMaterialUsed:
      initialValues?.estimatedMaterialUsed ??
      (defaultMaterialAmount !== "0"
        ? `${defaultMaterialAmount} ${defaultMaterialType}`
        : "500 g"),
  });

  const total = useMemo(() => {
    const durationCost = values.duration * values.durationRate;
    return material === "buy-from-lab"
      ? values.basePrice + durationCost + values.materialCost
      : values.basePrice + durationCost;
  }, [
    material,
    values.basePrice,
    values.duration,
    values.durationRate,
    values.materialCost,
  ]);

  const toggleEdit = () => {
    if (isEditing && onSave) {
      onSave(values);
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">Pricing Estimate</h3>
        </div>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Base Price</span>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.basePrice}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  basePrice: Number(e.target.value || 0),
                }))
              }
              className="h-8 w-full text-right sm:w-36"
            />
          ) : (
            <span>₱{values.basePrice.toFixed(2)}</span>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Duration ({unitName})</span>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              step="0.1"
              value={values.duration}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  duration: Number(e.target.value || 0),
                }))
              }
              className="h-8 w-full text-right sm:w-36"
            />
          ) : (
            <span>
              {values.duration.toFixed(1)} {unitName}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Rate per {unitName}</span>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.durationRate}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  durationRate: Number(e.target.value || 0),
                }))
              }
              className="h-8 w-full text-right sm:w-36"
            />
          ) : (
            <span>₱{values.durationRate.toFixed(2)}</span>
          )}
        </div>

        {material === "buy-from-lab" && (
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Material Cost</span>
            {isEditing ? (
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.materialCost}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    materialCost: Number(e.target.value || 0),
                  }))
                }
                className="h-8 w-full text-right sm:w-36"
              />
            ) : (
              <span>₱{values.materialCost.toFixed(2)}</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Est. Material Used</span>
          {isEditing ? (
            <Input
              value={values.estimatedMaterialUsed}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  estimatedMaterialUsed: e.target.value,
                }))
              }
              className="h-8 w-full text-right sm:w-36"
            />
          ) : (
            <span>{values.estimatedMaterialUsed}</span>
          )}
        </div>

        <FieldSeparator className="my-2" />

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-lg font-bold">Estimated Total</span>
          <span className="font-bold text-primary text-lg">
            ₱{total.toFixed(2)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex flex-col gap-2 sm:justify-end">
        {isEditing && (
          <ActionDialog
            title="Discard Estimate Changes"
            description="Are you sure you want to cancel the changes?"
            onConfirm={() => setIsEditing(false)}
            cancelButtonText="Back"
            confirmButtonText="Discard"
            className="w-full"
            baseActionText="Cancel"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleEdit}
          className="w-full rounded-md"
        >
          {isEditing ? "Save" : "Update Estimate"}
        </Button>
      </CardFooter>
    </Card>
  );
}
