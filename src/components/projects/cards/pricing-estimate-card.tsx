"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldSeparator } from "@/components/ui/field";
import {
  DetailCard,
  DetailChip,
} from "@/components/projects/cards/detail-card";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { ProjectMaterial } from "@convex/constants";
import {
  derivePricingFromSchema,
  type PricingServiceType,
  type ServicePricing,
} from "@/lib/project-pricing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TotalInvoice {
  subtotal: number;
  tax: number;
  total: number;
}

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
  _id: string | null;
  name: string;
  category?: string | null;
  type?: string | null;
  status?: string | null;
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
  totalInvoice?: TotalInvoice;
  service?: {
    serviceCategory:
      | {
          type: "WORKSHOP";
          amount: number;
          variants?: Array<{ name: string; amount: number }>;
        }
      | {
          type: "FABRICATION";
          setupFee: number;
          unitName: string;
          timeRate: number;
          variants?: Array<{ name: string; setupFee: number; timeRate: number }>;
        };
    name?: string;
  };
  serviceType?: PricingServiceType;
  projectPricing?: string;
  resourceUsages?: ResourceUsage[];
  requestedMaterials?: RequestedMaterial[];
  assignedMaker?: AssignedMaker | null;
  readOnly?: boolean;
}

export function PricingEstimateCard({
  projectId,
  material,
  totalInvoice,
  service,
  serviceType,
  projectPricing = "Default",
  resourceUsages,
  requestedMaterials = [],
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

  const primaryUsage = resourceUsages?.[0];

  const servicePricing: ServicePricing | undefined = service
    ? service.serviceCategory.type === "WORKSHOP"
      ? {
          type: "WORKSHOP",
          amount: service.serviceCategory.amount,
          variants: service.serviceCategory.variants,
        }
      : {
          type: "FABRICATION",
          setupFee: service.serviceCategory.setupFee,
          unitName: service.serviceCategory.unitName,
          timeRate: service.serviceCategory.timeRate,
          variants: service.serviceCategory.variants,
        }
    : undefined;

  const derived = useMemo(() => {
    return derivePricingFromSchema({
      servicePricing,
      pricingVariant: projectPricing,
      serviceType,
      bookingDurationMinutes: totalDurationMinutes,
    });
  }, [projectPricing, servicePricing, serviceType, totalDurationMinutes]);

  // ── Editable cost state ──────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  // Per-material amounts: materialId → amountUsed
  const initialMaterialAmounts = (): Record<string, number> => {
    const amounts: Record<string, number> = {};
    for (const usage of resourceUsages ?? []) {
      for (const m of usage.materialsUsed ?? []) {
        amounts[m.materialId] = (amounts[m.materialId] ?? 0) + m.amountUsed;
      }
    }
    return amounts;
  };

  const initialEditState = () => ({
    setupFee: derived.setupFee,
    rate: derived.rate,
    duration: derived.duration,
  });

  const [editValues, setEditValues] = useState(initialEditState);
  const [materialAmounts, setMaterialAmounts] = useState<Record<string, number>>(
    initialMaterialAmounts,
  );

  // ── Assignment edit state ────────────────────────────────────────────────
  const [selectedMakerId, setSelectedMakerId] = useState<string>(
    assignedMaker?._id ?? "",
  );
  const [selectedResourceId, setSelectedResourceId] = useState<string>(
    primaryUsage?.resourceDetails?._id ?? "",
  );
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(
    requestedMaterials.map((m) => m._id),
  );

  // Resolve selected material docs for live price preview while editing
  const selectedMaterialDocs = useMemo(
    () =>
      (isEditing ? selectedMaterialIds : requestedMaterials.map((m) => m._id))
        .map((id) => materials?.find((m) => m._id === id) ?? requestedMaterials.find((m) => m._id === id))
        .filter((m): m is NonNullable<typeof m> => !!m),
    [isEditing, materials, requestedMaterials, selectedMaterialIds],
  );

  const pricingType = servicePricing?.type ?? "WORKSHOP";
  const isTimeBased = pricingType === "FABRICATION";
  const isBuyFromLab = material === ProjectMaterial.BUY_FROM_LAB;

  const computedTimeCost = isTimeBased
    ? editValues.duration * editValues.rate
    : 0;
  const computedMaterialCost = isBuyFromLab
    ? selectedMaterialDocs.reduce((acc, m) => {
        const price = (m as RequestedMaterial).pricePerUnit ?? 0;
        const amount = materialAmounts[m._id] ?? 0;
        return acc + price * amount;
      }, 0)
    : 0;
  const computedTotal =
    editValues.setupFee + computedTimeCost + computedMaterialCost;

  // ── Displayed values ─────────────────────────────────────────────────────
  const displaySetupFee = isEditing ? editValues.setupFee : derived.setupFee;
  const displayTimeCost = isEditing
    ? computedTimeCost
    : derived.rate * derived.duration;

  // Material cost when not editing: sum from stored amounts × pricePerUnit
  const storedMaterialCost = requestedMaterials.reduce((acc, mat) => {
    const stored = initialMaterialAmounts();
    return acc + (stored[mat._id] ?? 0) * mat.pricePerUnit;
  }, 0);

  const displayMaterialCost = isEditing ? computedMaterialCost : storedMaterialCost;

  const displayTotal = isEditing
    ? computedTotal
    : totalInvoice
      ? totalInvoice.total
      : displaySetupFee + displayTimeCost + (isBuyFromLab ? displayMaterialCost : 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleEdit = () => {
    setEditValues(initialEditState());
    setMaterialAmounts(initialMaterialAmounts());
    setSelectedMakerId(assignedMaker?._id ?? "");
    setSelectedResourceId(primaryUsage?.resourceDetails?._id ?? "");
    setSelectedMaterialIds(requestedMaterials.map((m) => m._id));
    setIsEditing(true);
  };

  const handleDiscard = () => {
    setIsEditing(false);
    setEditValues(initialEditState());
    setMaterialAmounts(initialMaterialAmounts());
    setSelectedMakerId(assignedMaker?._id ?? "");
    setSelectedResourceId(primaryUsage?.resourceDetails?._id ?? "");
    setSelectedMaterialIds(requestedMaterials.map((m) => m._id));
  };

  const handleSave = async () => {
    try {
      const materialsUsedPayload = isBuyFromLab
        ? Object.entries(materialAmounts)
            .filter(([, amt]) => amt > 0)
            .map(([materialId, amountUsed]) => ({
              materialId: materialId as Id<"materials">,
              amountUsed,
            }))
        : undefined;

      await Promise.all([
        updateCostBreakdown({
          projectId,
          setupFee: editValues.setupFee,
          timeCost: computedTimeCost,
          materialCost: computedMaterialCost,
          materialsUsed: materialsUsedPayload,
        }),
        updateAssignments({
          projectId,
          makerId: selectedMakerId
            ? (selectedMakerId as Id<"userProfile">)
            : undefined,
          resourceId: selectedResourceId
            ? (selectedResourceId as Id<"resources">)
            : undefined,
          materialIds: selectedMaterialIds.length
            ? (selectedMaterialIds as Id<"materials">[])
            : [],
        }),
      ]);
      toast.success("Project updated.");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save changes.");
    }
  };

  const hasFinalBreakdown = !!totalInvoice;

  // ── Render ───────────────────────────────────────────────────────────────
  const headerChips = (
    <>
      {projectPricing && projectPricing !== "Default" && (
        <DetailChip
          label={projectPricing}
          bg="var(--fab-amber-light)"
          color="var(--fab-amber)"
          border="rgba(235,170,87,0.3)"
        />
      )}
      <DetailChip
        label={pricingType.replace("_", " ")}
        bg="var(--fab-bg-card)"
        color="var(--fab-text-muted)"
        border="var(--fab-border-md)"
      />
    </>
  );

  return (
    <DetailCard
      title={hasFinalBreakdown ? "Confirmed Pricing" : "Pricing Estimate"}
      titleClassName="text-[13px] tracking-tight normal-case"
      titleColor="var(--fab-text-primary)"
      headerRight={headerChips}
      onEdit={!readOnly && !isEditing ? handleEdit : undefined}
      isEditing={isEditing}
      onSave={handleSave}
      onCancel={handleDiscard}
      bodyClassName="space-y-3 py-3"
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

          {/* Materials (only relevant for buy-from-lab) */}
          {isBuyFromLab && (
            <div className="space-y-1">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Materials
              </p>
              {isEditing ? (
                <div className="flex flex-col gap-1.5 rounded-md border border-input p-2">
                  {materials?.map((m) => {
                    const isChecked = selectedMaterialIds.includes(m._id);
                    return (
                      <label
                        key={m._id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMaterialIds((prev) => [...prev, m._id]);
                            } else {
                              setSelectedMaterialIds((prev) =>
                                prev.filter((id) => id !== m._id),
                              );
                              setMaterialAmounts((prev) => {
                                const next = { ...prev };
                                delete next[m._id];
                                return next;
                              });
                            }
                          }}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        <span className="text-[12px] flex-1">{m.name}</span>
                        <span
                          className="text-[10px] shrink-0"
                          style={{ color: "var(--fab-text-muted)" }}
                        >
                          ₱{(m.pricePerUnit ?? 0).toFixed(2)}/{m.unit}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : requestedMaterials.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {requestedMaterials.map((mat) => (
                    <div key={mat._id} className="flex items-center gap-2.5">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-[5px] shrink-0 text-[10px] font-bold"
                        style={{
                          background: "var(--fab-amber-light)",
                          color: "var(--fab-amber)",
                        }}
                      >
                        {mat.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[12px] font-medium truncate"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {mat.name}
                        </p>
                      </div>
                      {mat.pricePerUnit != null && (
                        <p
                          className="text-[10px] shrink-0"
                          style={{ color: "var(--fab-text-muted)" }}
                        >
                          ₱{mat.pricePerUnit.toFixed(2)}/{mat.unit}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="text-[12px]"
                  style={{ color: "var(--fab-text-muted)" }}
                >
                  No materials selected.
                </p>
              )}
            </div>
          )}

          <FieldSeparator className="my-1" />
        </>
      )}

      {/* ── Cost rows ────────────────────────────────────────────────────── */}

      {/* WORKSHOP */}
      {pricingType === "WORKSHOP" && (
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

      {/* FABRICATION */}
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

      {/* Material usage rows (buy-from-lab only) */}
      {isBuyFromLab && (
        <>
          {(isEditing ? selectedMaterialDocs : requestedMaterials).map((mat) => {
            const matId = mat._id as string;
            const matUnit = (mat as RequestedMaterial).unit ?? "units";
            const matPrice = (mat as RequestedMaterial).pricePerUnit ?? 0;
            const storedAmounts = initialMaterialAmounts();
            const storedAmt = storedAmounts[matId] ?? 0;
            const displayAmt = isEditing
              ? (materialAmounts[matId] ?? 0)
              : storedAmt;
            return (
              <div key={matId} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fab-text-dim)" }}
                  >
                    {mat.name}
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={materialAmounts[matId] ?? 0}
                        onChange={(e) =>
                          setMaterialAmounts((prev) => ({
                            ...prev,
                            [matId]: Number(e.target.value || 0),
                          }))
                        }
                        className="h-7 w-24 text-right text-sm"
                      />
                      <span
                        className="text-[11px] shrink-0"
                        style={{ color: "var(--fab-text-muted)" }}
                      >
                        {matUnit}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {displayAmt} {matUnit}
                    </span>
                  )}
                </div>
                {matPrice > 0 && (
                  <div className="flex items-center justify-between gap-2 pl-2">
                    <span
                      className="text-[9px] tracking-normal font-normal"
                      style={{ color: "var(--fab-text-muted)" }}
                    >
                      ₱{matPrice.toFixed(2)} / {matUnit}
                    </span>
                    <span
                      className="text-[12px]"
                      style={{ color: "var(--fab-text-muted)" }}
                    >
                      ₱{(displayAmt * matPrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              Total Material Cost
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
    </DetailCard>
  );
}
