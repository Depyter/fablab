"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldSeparator } from "@/components/ui/field";
import { ActionDialog } from "../action-dialog";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { ProjectMaterial, ResourceUnit } from "@convex/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CostBreakdown {
  setupFee: number;
  materialCost: number;
  timeCost: number;
  total: number;
}

type ServicePricing =
  | {
      type: "FIXED";
      amount: number;
      variants?: Array<{ name: string; amount: number }>;
    }
  | {
      type: "PER_UNIT";
      setupFee: number;
      unitName: string;
      ratePerUnit: number;
      variants?: Array<{ name: string; setupFee: number; ratePerUnit: number }>;
    }
  | {
      type: "COMPOSITE";
      setupFee: number;
      unitName: string;
      timeRate: number;
      variants?: Array<{ name: string; setupFee: number; timeRate: number }>;
    };

interface RequestedMaterial {
  _id: string;
  name: string;
  unit: string;
  pricePerUnit: number;
}

interface AssignedMaker {
  _id: string;
  name: string;
  pfpUrl?: string | null;
}

interface ResourceDetails {
  _id: string;
  name: string;
  category?: string;
  type?: string;
  status?: string;
}

interface ResourceUsage {
  _id: string;
  startTime: number;
  endTime: number;
  resource?: string;
  resourceDetails?: ResourceDetails | null;
  materialsUsed?: Array<{
    amountUsed: number;
    materialId: string;
    name?: string;
    unit?: string;
  }>;
}

interface PricingEstimateCardProps {
  projectId: Id<"projects">;
  material: string;
  costBreakdown?: CostBreakdown;
  service?: {
    pricing: ServicePricing;
    name?: string;
  };
  projectPricing?: string;
  resourceUsages?: ResourceUsage[];
  requestedMaterial?: RequestedMaterial | null;
  requestedMaterialId?: string;
  assignedMaker?: AssignedMaker | null;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const unitToMinutes = (unit: string): number => {
  if (unit === ResourceUnit.HOUR) return 60;
  if (unit === ResourceUnit.DAY) return 60 * 24;
  return 1; // minute
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingEstimateCard({
  projectId,
  material,
  costBreakdown,
  service,
  projectPricing = "Default",
  resourceUsages,
  requestedMaterial,
  requestedMaterialId,
  assignedMaker,
  readOnly = false,
}: PricingEstimateCardProps) {
  const updateCostBreakdown = useMutation(
    api.projects.mutate.updateCostBreakdown,
  );
  const updateAssignments = useMutation(api.projects.mutate.updateProject);

  // ── Assignment data (admin/maker only) ───────────────────────────────────
  const makers = useQuery(api.users.getMakers, readOnly ? "skip" : {});
  const resources = useQuery(
    api.resource.query.getResources,
    readOnly ? "skip" : {},
  );
  const materials = useQuery(
    api.materials.query.getMaterials,
    readOnly ? "skip" : {},
  );

  // ── Derive defaults from service pricing + booking duration ─────────────
  const totalDurationMs =
    resourceUsages?.reduce((acc, u) => acc + (u.endTime - u.startTime), 0) ?? 0;
  const totalDurationMinutes = totalDurationMs / (1000 * 60);

  const selectedVariantKey =
    projectPricing && projectPricing !== "Default" ? projectPricing : null;

  const primaryUsage = resourceUsages?.[0];

  const derived = useMemo(() => {
    if (!service?.pricing) {
      return { setupFee: 0, rate: 0, duration: 0, unitName: "unit" };
    }

    const p = service.pricing;

    if (p.type === "FIXED") {
      const variant = selectedVariantKey
        ? p.variants?.find((v) => v.name === selectedVariantKey)
        : undefined;
      return {
        setupFee: variant ? variant.amount : p.amount,
        rate: 0,
        duration: 0,
        unitName: "unit",
      };
    }

    if (p.type === "PER_UNIT") {
      const variant = selectedVariantKey
        ? p.variants?.find((v) => v.name === selectedVariantKey)
        : undefined;
      const unitName = p.unitName;
      const durationInUnit =
        totalDurationMinutes > 0
          ? totalDurationMinutes / unitToMinutes(unitName)
          : 1;
      return {
        setupFee: variant ? variant.setupFee : p.setupFee,
        rate: variant ? variant.ratePerUnit : p.ratePerUnit,
        duration: durationInUnit,
        unitName,
      };
    }

    if (p.type === "COMPOSITE") {
      const variant = selectedVariantKey
        ? p.variants?.find((v) => v.name === selectedVariantKey)
        : undefined;
      const unitName = p.unitName;
      const durationInUnit =
        totalDurationMinutes > 0
          ? totalDurationMinutes / unitToMinutes(unitName)
          : 1;
      return {
        setupFee: variant ? variant.setupFee : p.setupFee,
        rate: variant ? variant.timeRate : p.timeRate,
        duration: durationInUnit,
        unitName,
      };
    }

    return { setupFee: 0, rate: 0, duration: 0, unitName: "unit" };
  }, [service, selectedVariantKey, totalDurationMinutes]);

  // ── Editable cost state ──────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  const initialAmountUsed =
    resourceUsages?.find((u) => u.materialsUsed && u.materialsUsed.length > 0)
      ?.materialsUsed?.[0]?.amountUsed ?? 0;

  const initialEditState = () => ({
    setupFee: costBreakdown?.setupFee ?? derived.setupFee,
    rate: derived.rate,
    duration: derived.duration,
    amountUsed: initialAmountUsed,
  });

  const [editValues, setEditValues] = useState(initialEditState);

  // ── Assignment edit state ────────────────────────────────────────────────
  const [selectedMakerId, setSelectedMakerId] = useState<string>(
    assignedMaker?._id ?? "",
  );
  const [selectedResourceId, setSelectedResourceId] = useState<string>(
    primaryUsage?.resourceDetails?._id ?? "",
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(
    requestedMaterialId ?? "",
  );

  // Resolve the material currently selected in the dropdown for live price preview
  const selectedMaterialDoc = useMemo(
    () => materials?.find((m) => m._id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId],
  );

  const pricePerUnit =
    (isEditing
      ? selectedMaterialDoc?.pricePerUnit
      : requestedMaterial?.pricePerUnit) ?? 0;
  const materialUnit =
    (isEditing ? selectedMaterialDoc?.unit : requestedMaterial?.unit) ??
    "units";
  const materialName =
    (isEditing ? selectedMaterialDoc?.name : requestedMaterial?.name) ?? "";

  const pricingType = service?.pricing?.type ?? "FIXED";
  const isTimeBased = pricingType === "PER_UNIT" || pricingType === "COMPOSITE";
  const isBuyFromLab = material === ProjectMaterial.BUY_FROM_LAB;

  const computedTimeCost = isTimeBased
    ? editValues.duration * editValues.rate
    : 0;
  const computedMaterialCost = isBuyFromLab
    ? editValues.amountUsed * pricePerUnit
    : 0;
  const computedTotal =
    editValues.setupFee + computedTimeCost + computedMaterialCost;

  // ── Displayed values (frozen breakdown takes priority when not editing) ──
  const displaySetupFee = isEditing
    ? editValues.setupFee
    : (costBreakdown?.setupFee ?? derived.setupFee);

  const displayTimeCost = isEditing
    ? computedTimeCost
    : (costBreakdown?.timeCost ?? derived.rate * derived.duration);

  const displayAmountUsed = isEditing
    ? editValues.amountUsed
    : initialAmountUsed;
  const displayMaterialCost = isEditing
    ? computedMaterialCost
    : (costBreakdown?.materialCost ?? initialAmountUsed * pricePerUnit);

  const displayTotal = isEditing
    ? computedTotal
    : costBreakdown
      ? costBreakdown.setupFee +
        costBreakdown.timeCost +
        costBreakdown.materialCost
      : displaySetupFee +
        displayTimeCost +
        (isBuyFromLab ? displayMaterialCost : 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleEdit = () => {
    setEditValues(initialEditState());
    setSelectedMakerId(assignedMaker?._id ?? "");
    setSelectedResourceId(primaryUsage?.resourceDetails?._id ?? "");
    setSelectedMaterialId(requestedMaterialId ?? "");
    setIsEditing(true);
  };

  const handleDiscard = () => {
    setIsEditing(false);
    setEditValues(initialEditState());
    setSelectedMakerId(assignedMaker?._id ?? "");
    setSelectedResourceId(primaryUsage?.resourceDetails?._id ?? "");
    setSelectedMaterialId(requestedMaterialId ?? "");
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        updateCostBreakdown({
          projectId,
          setupFee: editValues.setupFee,
          timeCost: computedTimeCost,
          materialCost: computedMaterialCost,
          amountUsed: isBuyFromLab ? editValues.amountUsed : undefined,
        }),
        updateAssignments({
          projectId,
          makerId: selectedMakerId
            ? (selectedMakerId as Id<"userProfile">)
            : undefined,
          resourceId: selectedResourceId
            ? (selectedResourceId as Id<"resources">)
            : undefined,
          materialId: selectedMaterialId
            ? (selectedMaterialId as Id<"materials">)
            : undefined,
        }),
      ]);
      toast.success("Project updated.");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save changes.");
    }
  };

  const hasFinalBreakdown = !!costBreakdown;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardContent className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">
            {hasFinalBreakdown ? "Confirmed Pricing" : "Pricing Estimate"}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
              {pricingType.replace("_", " ")}
            </span>
            {hasFinalBreakdown && !isEditing && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Final
              </span>
            )}
          </div>
        </div>

        {/* ── Assignment section (non-clients only) ── */}
        {!readOnly && (
          <>
            {/* Maker */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Assigned Maker
              </p>
              {isEditing ? (
                <Select
                  value={selectedMakerId}
                  onValueChange={setSelectedMakerId}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a maker" />
                  </SelectTrigger>
                  <SelectContent>
                    {makers?.map((maker) => (
                      <SelectItem key={maker._id} value={maker._id}>
                        {maker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : assignedMaker ? (
                <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
                  {assignedMaker.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assignedMaker.pfpUrl}
                      alt={assignedMaker.name}
                      className="h-6 w-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium shrink-0">
                      {assignedMaker.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-medium truncate">
                    {assignedMaker.name}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No maker assigned yet.
                </p>
              )}
            </div>

            {/* Resource */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Resource
              </p>
              {isEditing ? (
                <Select
                  value={selectedResourceId}
                  onValueChange={setSelectedResourceId}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources?.map((resource) => (
                      <SelectItem key={resource._id} value={resource._id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : primaryUsage?.resourceDetails ? (
                <div className="rounded-md bg-muted/60 px-3 py-2">
                  <p className="text-sm font-medium truncate">
                    {primaryUsage.resourceDetails.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {primaryUsage.resourceDetails.category && (
                      <span className="text-xs capitalize text-muted-foreground">
                        {primaryUsage.resourceDetails.category}
                      </span>
                    )}
                    {primaryUsage.resourceDetails.type && (
                      <span className="text-xs text-muted-foreground">
                        · {primaryUsage.resourceDetails.type}
                      </span>
                    )}
                    {primaryUsage.resourceDetails.status && (
                      <span className="text-xs text-muted-foreground">
                        · {primaryUsage.resourceDetails.status}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No resource assigned.
                </p>
              )}
            </div>

            {/* Material (only relevant for buy-from-lab) */}
            {isBuyFromLab && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Material
                </p>
                {isEditing ? (
                  <Select
                    value={selectedMaterialId}
                    onValueChange={setSelectedMaterialId}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials?.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}{" "}
                          <span className="text-muted-foreground">
                            ({m.unit})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : requestedMaterial ? (
                  <div className="rounded-md bg-muted/60 px-3 py-2 flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {requestedMaterial.name}
                    </p>
                    <p className="text-xs text-muted-foreground shrink-0 ml-2">
                      {requestedMaterial.pricePerUnit != null
                        ? `₱${requestedMaterial.pricePerUnit.toFixed(2)} / ${requestedMaterial.unit}`
                        : requestedMaterial.unit}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No material selected.
                  </p>
                )}
              </div>
            )}

            <FieldSeparator className="my-1" />
          </>
        )}

        {/* Pricing variant label */}
        {projectPricing && projectPricing !== "Default" && (
          <p className="text-xs text-muted-foreground">
            Variant: <span className="font-medium">{projectPricing}</span>
          </p>
        )}

        {/* ── FIXED ── */}
        {pricingType === "FIXED" && (
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Amount</span>
            {isEditing ? (
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editValues.setupFee}
                onChange={(e) =>
                  setEditValues((prev) => ({
                    ...prev,
                    setupFee: Number(e.target.value || 0),
                  }))
                }
                className="h-8 w-full text-right sm:w-36"
              />
            ) : (
              <span>₱{displaySetupFee.toFixed(2)}</span>
            )}
          </div>
        )}

        {/* ── PER_UNIT / COMPOSITE ── */}
        {isTimeBased && (
          <>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">Setup Fee</span>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editValues.setupFee}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      setupFee: Number(e.target.value || 0),
                    }))
                  }
                  className="h-8 w-full text-right sm:w-36"
                />
              ) : (
                <span>₱{displaySetupFee.toFixed(2)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Duration ({derived.unitName}s)
              </span>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={editValues.duration}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      duration: Number(e.target.value || 0),
                    }))
                  }
                  className="h-8 w-full text-right sm:w-36"
                />
              ) : (
                <span>
                  {derived.duration.toFixed(2)} {derived.unitName}s
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Rate / {derived.unitName}
              </span>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editValues.rate}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      rate: Number(e.target.value || 0),
                    }))
                  }
                  className="h-8 w-full text-right sm:w-36"
                />
              ) : (
                <span>₱{derived.rate.toFixed(2)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">Time Cost</span>
              <span className={isEditing ? "text-muted-foreground" : ""}>
                ₱{displayTimeCost.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {/* ── Material Usage (buy-from-lab only) ── */}
        {isBuyFromLab && (
          <>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Material Used
                {materialName && (
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    ({materialName})
                  </span>
                )}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editValues.amountUsed}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        amountUsed: Number(e.target.value || 0),
                      }))
                    }
                    className="h-8 w-24 text-right"
                  />
                  <span className="text-muted-foreground shrink-0">
                    {materialUnit}
                  </span>
                </div>
              ) : (
                <span>
                  {displayAmountUsed} {materialUnit}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Material Cost
                {pricePerUnit > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    (₱{pricePerUnit.toFixed(2)} / {materialUnit})
                  </span>
                )}
              </span>
              <span>₱{displayMaterialCost.toFixed(2)}</span>
            </div>
          </>
        )}

        <FieldSeparator className="my-2" />

        {/* Total */}
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-lg font-bold">
            {hasFinalBreakdown && !isEditing ? "Total" : "Estimated Total"}
          </span>
          <span className="font-bold text-primary text-lg">
            ₱{displayTotal.toFixed(2)}
          </span>
        </div>
      </CardContent>

      {!readOnly && (
        <CardFooter className="pt-0 flex flex-col gap-2 sm:justify-end">
          {isEditing ? (
            <>
              <ActionDialog
                title="Discard Changes"
                description="Are you sure you want to discard your edits?"
                onConfirm={handleDiscard}
                cancelButtonText="Back"
                confirmButtonText="Discard"
                className="w-full"
                baseActionText="Cancel"
              />
              <Button
                size="sm"
                onClick={handleSave}
                className="w-full rounded-md"
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="w-full rounded-md"
            >
              {hasFinalBreakdown ? "Edit Breakdown" : "Update Estimate"}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
