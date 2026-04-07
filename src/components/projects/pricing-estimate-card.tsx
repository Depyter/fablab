"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldSeparator } from "@/components/ui/field";
import { ActionDialog } from "../action-dialog";

type EstimationValues = {
  basePrice: number;
  estimatedDurationHours: number;
  materialCost: number;
  estimatedMaterialUsed: string;
};

interface PricingEstimateCardProps {
  material: string;
  initialValues?: Partial<EstimationValues>;
  onSave?: (values: EstimationValues) => void;
}

export function PricingEstimateCard({
  material,
  initialValues,
  onSave,
}: PricingEstimateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<EstimationValues>({
    basePrice: initialValues?.basePrice ?? 0,
    estimatedDurationHours: initialValues?.estimatedDurationHours ?? 2.5,
    materialCost: initialValues?.materialCost ?? 0,
    estimatedMaterialUsed: initialValues?.estimatedMaterialUsed ?? "500 g",
  });

  const total = useMemo(() => {
    return material === "buy-from-lab"
      ? values.basePrice + values.materialCost
      : values.basePrice;
  }, [material, values.basePrice, values.materialCost]);

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
          <span>₱{values.basePrice.toFixed(2)}</span>
        </div>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Est. Duration</span>
          {isEditing ? (
            <Input
              type="number"
              min={0}
              step="0.5"
              value={values.estimatedDurationHours}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  estimatedDurationHours: Number(e.target.value || 0),
                }))
              }
              className="h-8 w-full text-right sm:w-36"
            />
          ) : (
            <span>{values.estimatedDurationHours} hrs</span>
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
