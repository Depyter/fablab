"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
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
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--fab-border-md)" }}
    >
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{
          background: "var(--fab-bg-sidebar)",
          borderBottom: "1px solid var(--fab-border-md)",
        }}
      >
        <h3
          className="text-[13px] font-bold tracking-tight"
          style={{
            fontFamily: "Syne, sans-serif",
            color: "var(--fab-text-primary)",
          }}
        >
          {hasFinalBreakdown ? "Confirmed Pricing" : "Pricing Estimate"}
        </h3>
        <div className="flex items-center gap-1.5">
          {projectPricing && projectPricing !== "Default" && (
            <span
              className="inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em]"
              style={{
                background: "var(--fab-amber-light)",
                color: "var(--fab-amber)",
                border: "1px solid rgba(235,170,87,0.3)",
              }}
            >
              {projectPricing}
            </span>
          )}
          <span
            className="inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em]"
            style={{
              background: "var(--fab-bg-card)",
              color: "var(--fab-text-muted)",
              border: "1px solid var(--fab-border-md)",
            }}
          >
            {pricingType.replace("_", " ")}
          </span>
          {hasFinalBreakdown && !isEditing && (
            <span
              className="inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em]"
              style={{
                background:
                  "color-mix(in srgb, var(--fab-teal) 10%, var(--fab-bg-sidebar))",
                color: "var(--fab-teal)",
                border:
                  "1px solid color-mix(in srgb, var(--fab-teal) 25%, transparent)",
              }}
            >
              Final
            </span>
          )}
          {!readOnly && !isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1"
              onClick={handleEdit}
              aria-label="Edit pricing breakdown"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 space-y-3"
        style={{ background: "var(--fab-bg-card)" }}
      >
        {/* ── Assignment section (non-clients only) ── */}
        {!readOnly && (
          <>
            {/* Maker */}
            <div className="space-y-1">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Assigned Maker
              </p>
              {isEditing ? (
                <Select
                  value={selectedMakerId}
                  onValueChange={setSelectedMakerId}
                >
                  <SelectTrigger className="text-sm h-8">
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
                <div className="flex items-center gap-2.5">
                  {assignedMaker.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assignedMaker.pfpUrl}
                      alt={assignedMaker.name}
                      className="h-7 w-7 rounded-[6px] object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] shrink-0 text-[11px] font-bold"
                      style={{
                        background:
                          "color-mix(in srgb, var(--fab-teal) 15%, var(--fab-bg-sidebar))",
                        color: "var(--fab-teal)",
                      }}
                    >
                      {assignedMaker.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Maker
                    </p>
                    <p
                      className="text-[12px] font-medium truncate"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {assignedMaker.name}
                    </p>
                  </div>
                </div>
              ) : (
                <p
                  className="text-[12px]"
                  style={{ color: "var(--fab-text-muted)" }}
                >
                  No maker assigned yet.
                </p>
              )}
            </div>

            {/* Resource */}
            <div className="space-y-1">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Resource
              </p>
              {isEditing ? (
                <Select
                  value={selectedResourceId}
                  onValueChange={setSelectedResourceId}
                >
                  <SelectTrigger className="text-sm h-8">
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
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] shrink-0 text-[11px] font-bold mt-0.5"
                    style={{
                      background: "rgba(83,74,183,0.12)",
                      color: "#534AB7",
                    }}
                  >
                    {primaryUsage.resourceDetails.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Resource
                    </p>
                    <p
                      className="text-[12px] font-medium truncate"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {primaryUsage.resourceDetails.name}
                    </p>
                    {(primaryUsage.resourceDetails.category ||
                      primaryUsage.resourceDetails.type) && (
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "var(--fab-text-muted)" }}
                      >
                        {[
                          primaryUsage.resourceDetails.category,
                          primaryUsage.resourceDetails.type,
                          primaryUsage.resourceDetails.status,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p
                  className="text-[12px]"
                  style={{ color: "var(--fab-text-muted)" }}
                >
                  No resource assigned.
                </p>
              )}
            </div>

            {/* Material (only relevant for buy-from-lab) */}
            {isBuyFromLab && (
              <div className="space-y-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Material
                </p>
                {isEditing ? (
                  <Select
                    value={selectedMaterialId}
                    onValueChange={setSelectedMaterialId}
                  >
                    <SelectTrigger className="text-sm h-8">
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
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] shrink-0 text-[11px] font-bold"
                      style={{
                        background: "var(--fab-amber-light)",
                        color: "var(--fab-amber)",
                      }}
                    >
                      {requestedMaterial.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: "var(--fab-text-dim)" }}
                      >
                        Material
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p
                          className="text-[12px] font-medium truncate"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {requestedMaterial.name}
                        </p>
                        {requestedMaterial.pricePerUnit != null && (
                          <p
                            className="text-[10px] shrink-0"
                            style={{ color: "var(--fab-text-muted)" }}
                          >
                            ₱{requestedMaterial.pricePerUnit.toFixed(2)} /{" "}
                            {requestedMaterial.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--fab-text-muted)" }}
                  >
                    No material selected.
                  </p>
                )}
              </div>
            )}

            <FieldSeparator className="my-1" />
          </>
        )}

        {/* ── Cost rows ────────────────────────────────────────────────────── */}

        {/* FIXED */}
        {pricingType === "FIXED" && (
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              Amount
            </span>
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
                className="h-7 w-32 text-right text-sm"
              />
            ) : (
              <span
                className="text-[13px] font-medium"
                style={{ color: "var(--fab-text-primary)" }}
              >
                ₱{displaySetupFee.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* PER_UNIT / COMPOSITE */}
        {isTimeBased && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Setup Fee
              </span>
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
                  className="h-7 w-32 text-right text-sm"
                />
              ) : (
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  ₱{displaySetupFee.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
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
                  className="h-7 w-32 text-right text-sm"
                />
              ) : (
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  {derived.duration.toFixed(2)} {derived.unitName}s
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
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
                  className="h-7 w-32 text-right text-sm"
                />
              ) : (
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  ₱{derived.rate.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Time Cost
              </span>
              <span
                className="text-[13px] font-medium"
                style={{
                  color: isEditing
                    ? "var(--fab-text-muted)"
                    : "var(--fab-text-primary)",
                }}
              >
                ₱{displayTimeCost.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {/* Material Usage (buy-from-lab only) */}
        {isBuyFromLab && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Material Used
                {materialName && (
                  <span
                    className="ml-1 normal-case text-[9px] tracking-normal font-normal"
                    style={{ color: "var(--fab-text-muted)" }}
                  >
                    ({materialName})
                  </span>
                )}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1.5">
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
                    className="h-7 w-24 text-right text-sm"
                  />
                  <span
                    className="text-[11px] shrink-0"
                    style={{ color: "var(--fab-text-muted)" }}
                  >
                    {materialUnit}
                  </span>
                </div>
              ) : (
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  {displayAmountUsed} {materialUnit}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Material Cost
                {pricePerUnit > 0 && (
                  <span
                    className="ml-1 normal-case text-[9px] tracking-normal font-normal"
                    style={{ color: "var(--fab-text-muted)" }}
                  >
                    (₱{pricePerUnit.toFixed(2)} / {materialUnit})
                  </span>
                )}
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: "var(--fab-text-primary)" }}
              >
                ₱{displayMaterialCost.toFixed(2)}
              </span>
            </div>
          </>
        )}

        <FieldSeparator className="my-1" />

        {/* Total */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            {hasFinalBreakdown && !isEditing ? "Total" : "Estimated Total"}
          </span>
          <span
            className="text-[21px] font-extrabold leading-none"
            style={{ fontFamily: "Syne, sans-serif", color: "var(--fab-teal)" }}
          >
            ₱{displayTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      {!readOnly && isEditing && (
        <div
          className="flex flex-col gap-2 px-4 py-3"
          style={{
            background: "var(--fab-bg-sidebar)",
            borderTop: "1px solid var(--fab-border-md)",
          }}
        >
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
            className="w-full rounded-[6px] text-white font-semibold"
            style={{ background: "var(--fab-teal)", border: "none" }}
          >
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
