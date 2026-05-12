"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldSeparator } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UsageDraftItem,
  UsageReadOnlyItem,
  type UsageDraft,
  type ResourceUsage,
  type RequestedMaterial,
  type PricingService,
  type EditableResource,
  formatCurrency,
  formatDateInputValue,
  formatTimeInputValue,
  buildBookingRange,
  computeUsagePreview,
  sortUsages,
  buildUsageDraft,
} from "./usage-item";
import {
  validateUsageBookingPayloads,
  hasPastBooking,
  extractRetainedUsageIds,
  shouldUpdatePricingSnapshot,
  buildSyncMaterials,
} from "./pricing-persistence";

interface TotalInvoice {
  subtotal: number;
  tax: number;
  total: number;
}

interface PricingSnapshot {
  setupFee: number;
  timeCost: number;
  materialCost: number;
  total: number;
  duration: number;
  rate: number;
  unitName: string;
}

interface AssignedMaker {
  _id: string;
  name: string;
  pfpUrl?: string | null;
}

interface PricingEstimateCardProps {
  projectId: Id<"projects">;
  material: string;
  totalInvoice?: TotalInvoice;
  pricingSnapshot?: PricingSnapshot;
  service?: PricingService;
  serviceType?: PricingServiceType;
  projectPricing?: string;
  resourceUsages?: ResourceUsage[];
  assignedMaker?: AssignedMaker | null;
  headlineBookingStartTime?: number | null;
  headlineBookingEndTime?: number | null;
  readOnly?: boolean;
}

const NO_MAKER_VALUE = "__no_maker__";

export function PricingEstimateCard({
  projectId,
  material,
  totalInvoice,
  pricingSnapshot,
  service,
  serviceType,
  projectPricing = "Default",
  resourceUsages,
  assignedMaker,
  headlineBookingStartTime,
  headlineBookingEndTime,
  readOnly = false,
}: PricingEstimateCardProps) {
  const updateProject = useMutation(api.projects.mutate.updateProject);
  const createUsage = useMutation(api.projects.mutate.createUsage);
  const updateUsage = useMutation(api.projects.mutate.updateUsage);
  const updateUsagePricing = useMutation(
    api.projects.mutate.updateUsagePricing,
  );
  const updateProjectSchedule = useMutation(
    api.projects.mutate.updateProjectSchedule,
  );
  const deleteUsage = useMutation(api.projects.mutate.deleteUsage);

  const makers = useQuery(api.users.getMakers, readOnly ? "skip" : {});
  const resources = useQuery(
    api.resource.query.getResources,
    readOnly ? "skip" : {},
  );
  const materials = useQuery(
    api.materials.query.getMaterials,
    readOnly ? "skip" : {},
  );

  const servicePricing = useMemo<ServicePricing | undefined>(() => {
    if (!service) {
      return undefined;
    }

    return service.serviceCategory.type === "WORKSHOP"
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
        };
  }, [service]);

  const derived = useMemo(() => {
    return derivePricingFromSchema({
      servicePricing,
      pricingVariant: projectPricing,
      serviceType,
    });
  }, [projectPricing, servicePricing, serviceType]);

  const orderedUsages = sortUsages(resourceUsages ?? []);
  const isBuyFromLab = material === ProjectMaterial.BUY_FROM_LAB;
  const pricingType = servicePricing?.type ?? "WORKSHOP";
  const persistedUnitName = pricingSnapshot?.unitName ?? derived.unitName;
  const editableMaterialIds = useMemo(
    () =>
      service?.serviceCategory.type === "FABRICATION"
        ? Array.from(
            new Set([
              ...(service.serviceCategory.materials ?? []),
              ...orderedUsages.flatMap((usage: ResourceUsage) =>
                (usage.materialsUsed ?? []).map(
                  (materialEntry) => materialEntry.materialId,
                ),
              ),
            ]),
          )
        : [],
    [orderedUsages, service],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPastBookingDialog, setShowPastBookingDialog] = useState(false);
  const [selectedMakerId, setSelectedMakerId] = useState<string>(
    assignedMaker?._id ?? "",
  );
  const [usageDrafts, setUsageDrafts] = useState<UsageDraft[]>([]);
  const [nextDraftId, setNextDraftId] = useState(0);

  const editableMaterialDocs = useMemo(
    () =>
      editableMaterialIds
        .map((id) => materials?.find((materialDoc) => materialDoc._id === id))
        .filter(
          (materialDoc): materialDoc is NonNullable<typeof materialDoc> =>
            !!materialDoc,
        ),
    [editableMaterialIds, materials],
  );
  const editableMaterialLookup = useMemo(
    () =>
      new Map<string, RequestedMaterial>(
        editableMaterialDocs.map((materialDoc) => [
          materialDoc._id,
          materialDoc as RequestedMaterial,
        ]),
      ),
    [editableMaterialDocs],
  );
  const editableResources = useMemo<EditableResource[]>(() => {
    // We allow selecting any resource in the lab
    return (resources ?? []).map((resourceDoc) => ({
      _id: resourceDoc._id,
      name: resourceDoc.name,
      category: resourceDoc.category,
      type: resourceDoc.type,
      status: resourceDoc.status,
      description: resourceDoc.description,
    }));
  }, [resources]);

  const previewByDraftKey = new Map(
    usageDrafts.map((draft) => [
      draft.key,
      computeUsagePreview(draft, pricingType, editableMaterialLookup),
    ]),
  );

  const previewSummary = usageDrafts.reduce(
    (summary, draft) => {
      const preview = previewByDraftKey.get(draft.key);
      if (!preview) return summary;

      return {
        setupFee: summary.setupFee + draft.setupFeePortion,
        timeCost: summary.timeCost + preview.timeCost,
        materialCost: summary.materialCost + preview.materialCost,
        total: summary.total + preview.subtotal,
        duration: summary.duration + preview.duration,
      };
    },
    { setupFee: 0, timeCost: 0, materialCost: 0, total: 0, duration: 0 },
  );

  const displayDuration = isEditing
    ? previewSummary.duration
    : (pricingSnapshot?.duration ?? derived.duration);
  const displayRate = pricingSnapshot?.rate ?? derived.rate;
  const displaySetupFee = isEditing
    ? previewSummary.setupFee
    : (pricingSnapshot?.setupFee ?? derived.setupFee);
  const displayTimeCost = isEditing
    ? previewSummary.timeCost
    : (pricingSnapshot?.timeCost ?? derived.timeCost);
  const displayMaterialCost = isEditing
    ? previewSummary.materialCost
    : (pricingSnapshot?.materialCost ?? 0);
  const displayTotal = isEditing
    ? previewSummary.total
    : (totalInvoice?.total ?? pricingSnapshot?.total ?? derived.total);
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

  function openEdit() {
    setSelectedMakerId(assignedMaker?._id ?? "");
    setUsageDrafts(
      orderedUsages.map((usage: ResourceUsage) =>
        buildUsageDraft(usage, persistedUnitName),
      ),
    );
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setSelectedMakerId(assignedMaker?._id ?? "");
    setUsageDrafts([]);
  }

  function updateDraft(
    draftKey: string,
    updater: (draft: UsageDraft) => UsageDraft,
  ) {
    setUsageDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.key === draftKey ? updater(draft) : draft,
      ),
    );
  }

  function addUsageDraft() {
    const sourceDraft = usageDrafts.at(-1);
    const sourceRange =
      (sourceDraft &&
        buildBookingRange(
          sourceDraft.date,
          sourceDraft.startTime,
          sourceDraft.endTime,
        )) ||
      (headlineBookingStartTime != null && headlineBookingEndTime != null
        ? {
            startTime: headlineBookingStartTime,
            endTime: headlineBookingEndTime,
          }
        : null);

    const fallbackStart = sourceRange?.endTime ?? Date.now() + 60 * 60 * 1000;
    const fallbackDurationMs = Math.max(
      60 * 60 * 1000,
      sourceRange
        ? sourceRange.endTime - sourceRange.startTime
        : 60 * 60 * 1000,
    );
    const defaultStart = fallbackStart;
    const defaultEnd = fallbackStart + fallbackDurationMs;

    setUsageDrafts((currentDrafts) => [
      ...currentDrafts,
      {
        key: `new-${nextDraftId}`,
        date: formatDateInputValue(defaultStart),
        startTime: formatTimeInputValue(defaultStart),
        endTime: formatTimeInputValue(defaultEnd),
        resourceId: "",
        setupFeePortion:
          pricingType === "WORKSHOP"
            ? derived.setupFee
            : currentDrafts.length === 0
              ? derived.setupFee
              : 0,
        rate: derived.rate,
        unitName: persistedUnitName,
        materialAmounts: {},
      },
    ]);
    setNextDraftId((currentDraftId) => currentDraftId + 1);
  }

  function removeUsageDraft(draftKey: string) {
    setUsageDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.key !== draftKey),
    );
  }

  async function persistChanges(allowPastBooking: boolean) {
    try {
      setIsSaving(true);

      const makerChanged = selectedMakerId !== (assignedMaker?._id ?? "");

      const originalUsageMap = new Map<string, ResourceUsage>(
        orderedUsages.map((usage: ResourceUsage) => [usage._id, usage]),
      );

      const validation = validateUsageBookingPayloads(usageDrafts);
      if (!validation.valid) {
        toast.error(validation.error);
        setIsSaving(false);
        return;
      }
      const bookingPayloads = validation.bookingPayloads;

      if (
        !allowPastBooking &&
        hasPastBooking({
          bookingPayloads,
          usageDraftsLength: usageDrafts.length,
          headlineBookingStartTime,
        })
      ) {
        setShowPastBookingDialog(true);
        setIsSaving(false);
        return;
      }

      if (makerChanged) {
        await updateProject({
          projectId,
          makerId: selectedMakerId
            ? (selectedMakerId as Id<"userProfile">)
            : undefined,
        });
      }

      const retainedUsageIds = extractRetainedUsageIds(usageDrafts);

      for (const usage of orderedUsages) {
        if (!retainedUsageIds.has(usage._id)) {
          await deleteUsage({
            projectId,
            usageId: usage._id as Id<"resourceUsage">,
          });
        }
      }

      const syncedDrafts: Array<
        UsageDraft & {
          usageId: Id<"resourceUsage">;
        }
      > = [];

      for (const draft of usageDrafts) {
        const booking = bookingPayloads.get(draft.key)!;

        if (!draft.usageId) {
          const { usageId } = await createUsage({
            projectId,
            startTime: booking.startTime,
            endTime: booking.endTime,
            resourceId: booking.resourceId ?? undefined,
            allowPastBooking,
          });
          syncedDrafts.push({
            ...draft,
            usageId,
          });
          continue;
        }

        const originalUsage = originalUsageMap.get(draft.usageId);
        if (!originalUsage) continue;

        const scheduleChanged =
          originalUsage.startTime !== booking.startTime ||
          originalUsage.endTime !== booking.endTime;
        const resourceChanged =
          (originalUsage.resourceDetails?._id ??
            originalUsage.resource ??
            "") !== (draft.resourceId || "");

        if (scheduleChanged || resourceChanged) {
          await updateUsage({
            projectId,
            usageId: draft.usageId as Id<"resourceUsage">,
            startTime: booking.startTime,
            endTime: booking.endTime,
            resourceId: booking.resourceId,
            allowPastBooking,
          });
        }

        syncedDrafts.push({
          ...draft,
          usageId: draft.usageId as Id<"resourceUsage">,
        });
      }

      for (const draft of syncedDrafts) {
        const originalUsage = draft.usageId
          ? originalUsageMap.get(draft.usageId)
          : undefined;

        const preview = computeUsagePreview(
          draft,
          pricingType,
          editableMaterialLookup,
        );

        if (
          !shouldUpdatePricingSnapshot({
            draft,
            originalUsage,
            preview,
            isBuyFromLab,
          })
        ) {
          continue;
        }

        await updateUsagePricing({
          projectId,
          usageId: draft.usageId,
          duration: preview.duration,
          rate: draft.rate,
          timeCost: preview.timeCost,
          materialCost: preview.materialCost,
          setupFeePortion: draft.setupFeePortion,
          unitName: draft.unitName,
          materialsUsed: buildSyncMaterials(draft, isBuyFromLab),
        });
      }

      if (
        usageDrafts.length === 0 &&
        headlineBookingStartTime != null &&
        headlineBookingEndTime != null
      ) {
        await updateProjectSchedule({
          projectId,
          startTime: headlineBookingStartTime,
          endTime: headlineBookingEndTime,
          allowPastBooking,
        });
      }

      toast.success("Project updated.");
      setIsEditing(false);
      setUsageDrafts([]);
      setShowPastBookingDialog(false);
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSave() {
    void persistChanges(false);
  }

  return (
    <>
      <DetailCard
        title={totalInvoice ? "Confirmed Pricing" : "Pricing Estimate"}
        titleClassName="text-[13px] tracking-tight normal-case"
        titleColor="var(--fab-text-primary)"
        headerRight={headerChips}
        onEdit={!readOnly && !isEditing ? openEdit : undefined}
        isEditing={isEditing}
        onSave={handleSave}
        onCancel={cancelEdit}
        isSaving={isSaving}
        bodyClassName="space-y-4 py-3"
      >
        {!readOnly && (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Assigned Maker
                </p>
                {isEditing ? (
                  <Select
                    value={selectedMakerId || NO_MAKER_VALUE}
                    onValueChange={(value) =>
                      setSelectedMakerId(value === NO_MAKER_VALUE ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select a maker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MAKER_VALUE}>Unassigned</SelectItem>
                      {makers?.map((maker) => (
                        <SelectItem key={maker._id} value={maker._id}>
                          {maker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : assignedMaker ? (
                  <p
                    className="text-[12px] font-medium"
                    style={{ color: "var(--fab-text-primary)" }}
                  >
                    {assignedMaker.name}
                  </p>
                ) : (
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--fab-text-muted)" }}
                  >
                    Unassigned
                  </p>
                )}
              </div>
            </div>

            <FieldSeparator className="my-1" />
          </>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              Usages
            </p>
            {isEditing && !readOnly && (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold"
                onClick={addUsageDraft}
                style={{ background: "var(--fab-teal)", border: "none" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Usage
              </Button>
            )}
          </div>

          {(isEditing ? usageDrafts : orderedUsages).length === 0 ? (
            <div
              className="rounded-lg border border-dashed px-3 py-4 text-sm"
              style={{
                borderColor: "var(--fab-border-md)",
                color: "var(--fab-text-muted)",
              }}
            >
              No usages yet.
            </div>
          ) : isEditing ? (
            service &&
            usageDrafts.map((draft, index) => (
              <UsageDraftItem
                key={draft.key}
                draft={draft}
                index={index}
                pricingType={pricingType}
                preview={previewByDraftKey.get(draft.key)!}
                service={service}
                editableResources={editableResources}
                editableMaterialDocs={
                  editableMaterialDocs as RequestedMaterial[]
                }
                isBuyFromLab={isBuyFromLab}
                allDrafts={usageDrafts}
                onRemove={() => removeUsageDraft(draft.key)}
                onUpdateDraft={(updater) => updateDraft(draft.key, updater)}
              />
            ))
          ) : (
            orderedUsages.map((usage: ResourceUsage, index: number) => (
              <UsageReadOnlyItem
                key={usage._id}
                usage={usage}
                index={index}
                pricingType={pricingType}
                isBuyFromLab={isBuyFromLab}
                persistedUnitName={persistedUnitName}
              />
            ))
          )}
        </div>

        <FieldSeparator className="my-1" />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              {pricingType === "WORKSHOP" ? "Amount" : "Setup Fee"}
            </span>
            <span
              className="text-[13px] font-medium"
              style={{ color: "var(--fab-text-primary)" }}
            >
              {formatCurrency(displaySetupFee)}
            </span>
          </div>

          {pricingType === "FABRICATION" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Duration
                </span>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  {displayDuration.toFixed(2)} {persistedUnitName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Time Cost
                </span>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  {formatCurrency(displayTimeCost)}
                </span>
              </div>
              {!isEditing && (
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fab-text-dim)" }}
                  >
                    Rate
                  </span>
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: "var(--fab-text-primary)" }}
                  >
                    {formatCurrency(displayRate)}
                  </span>
                </div>
              )}
            </>
          )}

          {isBuyFromLab && (
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Material Cost
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: "var(--fab-text-primary)" }}
              >
                {formatCurrency(displayMaterialCost)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              Total
            </span>
            <span
              className="text-[15px] font-semibold"
              style={{ color: "var(--fab-text-primary)" }}
            >
              {formatCurrency(displayTotal)}
            </span>
          </div>
        </div>
      </DetailCard>

      <AlertDialog
        open={showPastBookingDialog}
        onOpenChange={setShowPastBookingDialog}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Save past booking?</AlertDialogTitle>
            <AlertDialogDescription>
              One or more usage dates are in the past. Confirm to save this
              project as backlog or historical work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={() => {
                void persistChanges(true);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
