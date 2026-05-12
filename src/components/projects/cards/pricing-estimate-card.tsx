"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DateTimePicker,
  type DateTimePickerValue,
} from "@/components/booking/date-time-picker";
import {
  WorkshopTimeSlotPicker,
  type WorkshopTimeSlotValue,
} from "@/components/booking/workshop-time-slot-picker";
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
  getDurationMinutesFromTimestampRange,
  getDurationUnitsFromMinutes,
  type PricingServiceType,
  type ServicePricing,
} from "@/lib/project-pricing";
import { Plus, Trash2 } from "lucide-react";

function formatDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildTimestamp(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

function buildBookingRange(
  dateValue: string,
  startTimeValue: string,
  endTimeValue: string,
) {
  if (!dateValue || !startTimeValue || !endTimeValue) return null;

  const startTime = buildTimestamp(dateValue, startTimeValue);
  const endTime = buildTimestamp(dateValue, endTimeValue);

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return null;
  }

  return { startTime, endTime };
}

function formatUsageDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUsageTimeRange(startTime: number, endTime: number) {
  return `${new Date(startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${new Date(endTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatCurrency(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

function toMaterialAmountMap(
  materialsUsed?: Array<{ materialId: string; amountUsed: number }>,
) {
  const amounts: Record<string, number> = {};
  for (const material of materialsUsed ?? []) {
    amounts[material.materialId] = material.amountUsed;
  }
  return amounts;
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every(
    (value, index) => value === normalizedRight[index],
  );
}

function nearlyEqual(left: number, right: number) {
  return Math.abs(left - right) <= 0.0001;
}

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

interface UsagePricingSnapshot {
  duration: number;
  rate: number;
  timeCost: number;
  materialCost: number;
  setupFeePortion: number;
  subtotal: number;
  unitName: string;
  pricingVariant?: string;
}

interface RequestedMaterial {
  _id: string;
  name: string;
  unit: string;
  pricePerUnit?: number;
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
  description?: string | null;
}

interface ResourceUsage {
  _id: string;
  startTime: number;
  endTime: number;
  resource?: string;
  snapshot: {
    costAtTime: number;
    unit: string;
  };
  pricingSnapshot?: UsagePricingSnapshot;
  resourceDetails?: ResourceDetails | null;
  materialsUsed?: Array<{
    amountUsed: number;
    materialId: string;
    name?: string;
    unit?: string;
  }>;
}

interface UsageDraft {
  key: string;
  usageId?: string;
  date: string;
  startTime: string;
  endTime: string;
  resourceId: string;
  setupFeePortion: number;
  rate: number;
  unitName: string;
  materialAmounts: Record<string, number>;
}

interface PricingEstimateCardProps {
  projectId: Id<"projects">;
  material: string;
  totalInvoice?: TotalInvoice;
  pricingSnapshot?: PricingSnapshot;
  service?: {
    _id: Id<"services">;
    resources?: Id<"resources">[];
    serviceCategory:
      | {
          type: "WORKSHOP";
          schedules: Array<{
            date: number;
            timeSlots: Array<{
              startTime: number;
              endTime: number;
              maxSlots: number;
              usedUpSlots?: number;
            }>;
          }>;
          amount: number;
          variants?: Array<{ name: string; amount: number }>;
        }
      | {
          type: "FABRICATION";
          availableDays?: number[];
          materials?: Id<"materials">[];
          setupFee: number;
          unitName: string;
          timeRate: number;
          variants?: Array<{
            name: string;
            setupFee: number;
            timeRate: number;
          }>;
        };
    name?: string;
  };
  serviceType?: PricingServiceType;
  projectPricing?: string;
  resourceUsages?: ResourceUsage[];
  assignedMaker?: AssignedMaker | null;
  headlineBookingStartTime?: number | null;
  headlineBookingEndTime?: number | null;
  readOnly?: boolean;
}

const NO_RESOURCE_VALUE = "__no_resource__";
const NO_MAKER_VALUE = "__no_maker__";
const NO_MATERIAL_VALUE = "__no_material__";

function parseDraftDate(dateValue: string) {
  if (!dateValue) return undefined;

  const timestamp = buildTimestamp(dateValue, "00:00");
  if (Number.isNaN(timestamp)) return undefined;

  return new Date(timestamp);
}

function getDraftMaterialIds(draft: UsageDraft) {
  return Object.keys(draft.materialAmounts).sort();
}

function isPastBookingRange(startTime: number) {
  return startTime < Date.now();
}

type MaterialLookup = Map<string, RequestedMaterial>;

function computeUsagePreview(
  draft: UsageDraft,
  pricingType: ServicePricing["type"],
  materialLookup: MaterialLookup,
) {
  const bookingRange = buildBookingRange(
    draft.date,
    draft.startTime,
    draft.endTime,
  );
  const durationMinutes = bookingRange
    ? getDurationMinutesFromTimestampRange(
        bookingRange.startTime,
        bookingRange.endTime,
      )
    : 0;
  const duration =
    pricingType === "FABRICATION"
      ? getDurationUnitsFromMinutes(durationMinutes, draft.unitName)
      : 0;
  const timeCost = pricingType === "FABRICATION" ? duration * draft.rate : 0;
  const materialCost = Object.entries(draft.materialAmounts).reduce(
    (sum, [materialId, amountUsed]) =>
      sum + amountUsed * (materialLookup.get(materialId)?.pricePerUnit ?? 0),
    0,
  );

  return {
    duration,
    timeCost,
    materialCost,
    subtotal: draft.setupFeePortion + timeCost + materialCost,
    unitName: draft.unitName,
  };
}

interface UsageScheduleEditorProps {
  draft: UsageDraft;
  service: NonNullable<PricingEstimateCardProps["service"]>;
  onChange: (nextValue: DateTimePickerValue | WorkshopTimeSlotValue) => void;
}

function UsageScheduleEditor({
  draft,
  service,
  onChange,
}: UsageScheduleEditorProps) {
  const dateValue = parseDraftDate(draft.date);
  const bookedSlots = useQuery(
    api.services.query.getBookedTimeSlots,
    service.serviceCategory.type === "FABRICATION" && dateValue
      ? {
          serviceId: service._id,
          date: dateValue.getTime(),
          resourceId: draft.resourceId
            ? (draft.resourceId as Id<"resources">)
            : undefined,
        }
      : "skip",
  );

  if (service.serviceCategory.type === "WORKSHOP") {
    return (
      <WorkshopTimeSlotPicker
        value={{
          date: dateValue,
          startTime: draft.startTime,
          endTime: draft.endTime,
        }}
        onChange={onChange}
        schedules={service.serviceCategory.schedules}
      />
    );
  }

  return (
    <DateTimePicker
      value={{
        date: dateValue,
        startTime: draft.startTime,
        endTime: draft.endTime,
      }}
      onChange={onChange}
      availableDays={service.serviceCategory.availableDays ?? []}
      allowPastSelection
      bookedTimeBlocks={(bookedSlots ?? [])
        .filter((slot) => slot.usageId !== draft.usageId)
        .map((slot) => ({
          start: formatTimeInputValue(slot.startTime),
          end: formatTimeInputValue(slot.endTime),
        }))}
    />
  );
}

interface UsageMaterialEditorProps {
  draft: UsageDraft;
  materialOptions: RequestedMaterial[];
  onAddMaterial: (materialId: string) => void;
  onUpdateAmount: (materialId: string, amountUsed: number) => void;
  onRemoveMaterial: (materialId: string) => void;
}

function UsageMaterialEditor({
  draft,
  materialOptions,
  onAddMaterial,
  onUpdateAmount,
  onRemoveMaterial,
}: UsageMaterialEditorProps) {
  const [pickerValue, setPickerValue] = useState(NO_MATERIAL_VALUE);
  const selectedMaterialIds = getDraftMaterialIds(draft);
  const selectedMaterials = selectedMaterialIds
    .map((materialId) =>
      materialOptions.find((materialDoc) => materialDoc._id === materialId),
    )
    .filter((materialDoc): materialDoc is RequestedMaterial => !!materialDoc);
  const addableMaterials = materialOptions.filter(
    (materialDoc) => !selectedMaterialIds.includes(materialDoc._id),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--fab-text-dim)" }}
        >
          Materials
        </p>
        {addableMaterials.length > 0 && (
          <Select
            value={pickerValue}
            onValueChange={(value) => {
              if (value === NO_MATERIAL_VALUE) {
                return;
              }
              onAddMaterial(value);
              setPickerValue(NO_MATERIAL_VALUE);
            }}
          >
            <SelectTrigger className="h-8 w-full text-sm sm:w-[220px]">
              <SelectValue placeholder="Add material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MATERIAL_VALUE}>Add material</SelectItem>
              {addableMaterials.map((materialDoc) => (
                <SelectItem key={materialDoc._id} value={materialDoc._id}>
                  {materialDoc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedMaterials.length > 0 ? (
        <div className="space-y-2">
          {selectedMaterials.map((materialDoc) => (
            <div
              key={materialDoc._id}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]"
            >
              <div className="min-w-0">
                <p
                  className="text-[12px] font-medium"
                  style={{ color: "var(--fab-text-primary)" }}
                >
                  {materialDoc.name}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--fab-text-muted)" }}
                >
                  {formatCurrency(materialDoc.pricePerUnit ?? 0)}/
                  {materialDoc.unit}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.materialAmounts[materialDoc._id] ?? 0}
                onChange={(event) =>
                  onUpdateAmount(
                    materialDoc._id,
                    Number(event.target.value || 0),
                  )
                }
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onRemoveMaterial(materialDoc._id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px]" style={{ color: "var(--fab-text-muted)" }}>
          No materials selected.
        </p>
      )}
    </div>
  );
}

function sortUsages(usages: ResourceUsage[]) {
  return [...usages].sort(
    (left, right) =>
      left.startTime - right.startTime || left._id.localeCompare(right._id),
  );
}

function buildUsageDraft(
  usage: ResourceUsage,
  fallbackUnitName: string,
): UsageDraft {
  return {
    key: usage._id,
    usageId: usage._id,
    date: formatDateInputValue(usage.startTime),
    startTime: formatTimeInputValue(usage.startTime),
    endTime: formatTimeInputValue(usage.endTime),
    resourceId: usage.resourceDetails?._id ?? usage.resource ?? "",
    setupFeePortion:
      usage.pricingSnapshot?.setupFeePortion ?? usage.snapshot.costAtTime ?? 0,
    rate: usage.pricingSnapshot?.rate ?? 0,
    unitName: usage.pricingSnapshot?.unitName ?? fallbackUnitName,
    materialAmounts: toMaterialAmountMap(usage.materialsUsed),
  };
}

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
              ...orderedUsages.flatMap((usage) =>
                (usage.materialsUsed ?? []).map(
                  (materialEntry) => materialEntry.materialId,
                ),
              ),
            ]),
          )
        : [],
    [orderedUsages, service],
  );
  const editableResourceIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(service?.resources ?? []),
          ...orderedUsages
            .map(
              (usage) => usage.resourceDetails?._id ?? usage.resource ?? null,
            )
            .filter((resourceId): resourceId is string => !!resourceId),
        ]),
      ),
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
      new Map(
        editableMaterialDocs.map((materialDoc) => [
          materialDoc._id,
          materialDoc,
        ]),
      ),
    [editableMaterialDocs],
  );
  const editableResources = useMemo(() => {
    const matchedResources = editableResourceIds.map((resourceId) =>
      resources?.find((resourceDoc) => resourceDoc._id === resourceId),
    );

    return matchedResources.filter(
      (
        resourceDoc,
      ): resourceDoc is Exclude<(typeof matchedResources)[number], undefined> =>
        resourceDoc !== undefined,
    );
  }, [editableResourceIds, resources]);

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
      orderedUsages.map((usage) => buildUsageDraft(usage, persistedUnitName)),
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

      const originalUsageMap = new Map(
        orderedUsages.map((usage) => [usage._id, usage]),
      );

      const bookingPayloads = new Map<
        string,
        {
          startTime: number;
          endTime: number;
          resourceId: Id<"resources"> | null;
        }
      >();

      for (const draft of usageDrafts) {
        const bookingRange = buildBookingRange(
          draft.date,
          draft.startTime,
          draft.endTime,
        );
        if (!bookingRange) {
          toast.error(
            "Please enter a valid booking date and time for every usage.",
          );
          setIsSaving(false);
          return;
        }
        if (bookingRange.endTime <= bookingRange.startTime) {
          toast.error("Every usage must end after it starts.");
          setIsSaving(false);
          return;
        }

        bookingPayloads.set(draft.key, {
          startTime: bookingRange.startTime,
          endTime: bookingRange.endTime,
          resourceId: draft.resourceId
            ? (draft.resourceId as Id<"resources">)
            : null,
        });
      }

      const hasPastUsageBooking = Array.from(bookingPayloads.values()).some(
        ({ startTime }) => isPastBookingRange(startTime),
      );
      const hasPastHeadlineBooking =
        usageDrafts.length === 0 &&
        headlineBookingStartTime != null &&
        isPastBookingRange(headlineBookingStartTime);

      if (
        !allowPastBooking &&
        (hasPastUsageBooking || hasPastHeadlineBooking)
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

      const retainedUsageIds = new Set(
        usageDrafts
          .map((draft) => draft.usageId)
          .filter((usageId): usageId is string => !!usageId),
      );

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
        const selectedUsageMaterials = isBuyFromLab
          ? getDraftMaterialIds(draft).map((materialId) => ({
              materialId: materialId as Id<"materials">,
              amountUsed: draft.materialAmounts[materialId] ?? 0,
            }))
          : undefined;

        const preview = computeUsagePreview(
          draft,
          pricingType,
          editableMaterialLookup,
        );
        const originalMaterialMap = toMaterialAmountMap(
          originalUsage?.materialsUsed,
        );
        const originalMaterialIdsForUsage = (
          originalUsage?.materialsUsed ?? []
        ).map((materialEntry) => materialEntry.materialId);
        const draftMaterialIds = getDraftMaterialIds(draft);

        const shouldUpdatePricing =
          !originalUsage ||
          !originalUsage.pricingSnapshot ||
          !nearlyEqual(
            originalUsage.pricingSnapshot.setupFeePortion,
            draft.setupFeePortion,
          ) ||
          !nearlyEqual(originalUsage.pricingSnapshot.rate, draft.rate) ||
          !nearlyEqual(
            originalUsage.pricingSnapshot.duration,
            preview.duration,
          ) ||
          !nearlyEqual(
            originalUsage.pricingSnapshot.timeCost,
            preview.timeCost,
          ) ||
          !nearlyEqual(
            originalUsage.pricingSnapshot.materialCost,
            preview.materialCost,
          ) ||
          originalUsage.pricingSnapshot.unitName !== draft.unitName ||
          (isBuyFromLab &&
            (!sameStringSet(draftMaterialIds, originalMaterialIdsForUsage) ||
              draftMaterialIds.some(
                (materialId) =>
                  (draft.materialAmounts[materialId] ?? 0) !==
                  (originalMaterialMap[materialId] ?? 0),
              )));

        if (!shouldUpdatePricing) continue;

        await updateUsagePricing({
          projectId,
          usageId: draft.usageId,
          duration: preview.duration,
          rate: draft.rate,
          timeCost: preview.timeCost,
          materialCost: preview.materialCost,
          setupFeePortion: draft.setupFeePortion,
          unitName: draft.unitName,
          materialsUsed: selectedUsageMaterials,
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
            usageDrafts.map((draft, index) => {
              const preview = previewByDraftKey.get(draft.key)!;

              return (
                <div
                  key={draft.key}
                  className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0"
                  style={{
                    borderColor: "var(--fab-border-soft)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      Usage {index + 1}
                    </p>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {formatCurrency(preview.subtotal)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => removeUsageDraft(draft.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>

                  {pricingType === "FABRICATION" &&
                    editableResources.length > 0 && (
                      <div className="space-y-1">
                        <p
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: "var(--fab-text-dim)" }}
                        >
                          Resource
                        </p>
                        <Select
                          value={draft.resourceId || NO_RESOURCE_VALUE}
                          onValueChange={(value) =>
                            updateDraft(draft.key, (currentDraft) => ({
                              ...currentDraft,
                              resourceId:
                                value === NO_RESOURCE_VALUE ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select a resource" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_RESOURCE_VALUE}>
                              No resource
                            </SelectItem>
                            {editableResources.map((resourceDoc) => (
                              <SelectItem
                                key={resourceDoc._id}
                                value={resourceDoc._id}
                              >
                                {resourceDoc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  {service && (
                    <UsageScheduleEditor
                      draft={draft}
                      service={service}
                      onChange={(nextValue) =>
                        updateDraft(draft.key, (currentDraft) => ({
                          ...currentDraft,
                          date: nextValue.date
                            ? formatDateInputValue(nextValue.date.getTime())
                            : "",
                          startTime: nextValue.startTime,
                          endTime: nextValue.endTime,
                        }))
                      }
                    />
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p
                        className="text-[9px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--fab-text-dim)" }}
                      >
                        {pricingType === "WORKSHOP"
                          ? "Amount"
                          : "Setup Fee Portion"}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.setupFeePortion}
                        onChange={(event) =>
                          updateDraft(draft.key, (currentDraft) => ({
                            ...currentDraft,
                            setupFeePortion: Number(event.target.value || 0),
                          }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {pricingType === "FABRICATION" && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <p
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: "var(--fab-text-dim)" }}
                        >
                          Rate
                        </p>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft.rate}
                          onChange={(event) =>
                            updateDraft(draft.key, (currentDraft) => ({
                              ...currentDraft,
                              rate: Number(event.target.value || 0),
                            }))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <p
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: "var(--fab-text-dim)" }}
                        >
                          Duration
                        </p>
                        <p
                          className="text-[12px] font-medium"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {preview.duration.toFixed(2)} {draft.unitName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: "var(--fab-text-dim)" }}
                        >
                          Time Cost
                        </p>
                        <p
                          className="text-[12px] font-medium"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {formatCurrency(preview.timeCost)}
                        </p>
                      </div>
                    </div>
                  )}

                  {isBuyFromLab &&
                    pricingType === "FABRICATION" &&
                    editableMaterialDocs.length > 0 && (
                      <UsageMaterialEditor
                        draft={draft}
                        materialOptions={editableMaterialDocs}
                        onAddMaterial={(materialId) =>
                          updateDraft(draft.key, (currentDraft) => ({
                            ...currentDraft,
                            materialAmounts: {
                              ...currentDraft.materialAmounts,
                              [materialId]:
                                currentDraft.materialAmounts[materialId] ?? 0,
                            },
                          }))
                        }
                        onUpdateAmount={(materialId, amountUsed) =>
                          updateDraft(draft.key, (currentDraft) => ({
                            ...currentDraft,
                            materialAmounts: {
                              ...currentDraft.materialAmounts,
                              [materialId]: amountUsed,
                            },
                          }))
                        }
                        onRemoveMaterial={(materialId) =>
                          updateDraft(draft.key, (currentDraft) => {
                            const nextMaterialAmounts = {
                              ...currentDraft.materialAmounts,
                            };
                            delete nextMaterialAmounts[materialId];
                            return {
                              ...currentDraft,
                              materialAmounts: nextMaterialAmounts,
                            };
                          })
                        }
                      />
                    )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--fab-text-dim)" }}
                      >
                        Material Cost
                      </span>
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: "var(--fab-text-primary)" }}
                      >
                        {formatCurrency(preview.materialCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--fab-text-dim)" }}
                      >
                        Subtotal
                      </span>
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: "var(--fab-text-primary)" }}
                      >
                        {formatCurrency(preview.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            orderedUsages.map((usage, index) => (
              <div
                key={usage._id}
                className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0"
                style={{
                  borderColor: "var(--fab-border-soft)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="text-[12px] font-semibold"
                    style={{ color: "var(--fab-text-primary)" }}
                  >
                    Usage {index + 1}
                  </p>
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: "var(--fab-text-primary)" }}
                  >
                    {formatCurrency(
                      usage.pricingSnapshot?.subtotal ??
                        usage.snapshot.costAtTime,
                    )}
                  </span>
                </div>

                <div
                  className={`grid gap-3 ${
                    pricingType === "FABRICATION" ? "sm:grid-cols-2" : ""
                  }`}
                >
                  {pricingType === "FABRICATION" && (
                    <div className="space-y-1">
                      <p
                        className="text-[9px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--fab-text-dim)" }}
                      >
                        Resource
                      </p>
                      <p
                        className="text-[12px] font-medium"
                        style={{ color: "var(--fab-text-primary)" }}
                      >
                        {usage.resourceDetails?._id
                          ? usage.resourceDetails.name
                          : "No resource assigned"}
                      </p>
                      {usage.resourceDetails?._id &&
                        (usage.resourceDetails.category ||
                          usage.resourceDetails.type ||
                          usage.resourceDetails.status) && (
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--fab-text-muted)" }}
                          >
                            {[
                              usage.resourceDetails.category,
                              usage.resourceDetails.type,
                              usage.resourceDetails.status,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Schedule
                    </p>
                    <p
                      className="text-[12px] font-medium"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {formatUsageDate(usage.startTime)}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--fab-text-muted)" }}
                    >
                      {formatUsageTimeRange(usage.startTime, usage.endTime)}
                    </p>
                  </div>
                </div>

                {isBuyFromLab && pricingType === "FABRICATION" && (
                  <div className="space-y-1">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Material Usage
                    </p>
                    {(usage.materialsUsed ?? []).length > 0 ? (
                      <div className="space-y-1.5">
                        {(usage.materialsUsed ?? []).map((materialEntry) => (
                          <div
                            key={materialEntry.materialId}
                            className="flex items-center justify-between gap-3"
                          >
                            <span
                              className="text-[12px]"
                              style={{ color: "var(--fab-text-primary)" }}
                            >
                              {materialEntry.name ?? "Material"}
                            </span>
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--fab-text-muted)" }}
                            >
                              {materialEntry.amountUsed}{" "}
                              {materialEntry.unit ?? "units"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-[12px]"
                        style={{ color: "var(--fab-text-muted)" }}
                      >
                        No materials allocated.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      {pricingType === "WORKSHOP"
                        ? "Amount"
                        : "Setup Fee Portion"}
                    </span>
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {formatCurrency(
                        usage.pricingSnapshot?.setupFeePortion ?? 0,
                      )}
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
                          className="text-[12px] font-medium"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {(usage.pricingSnapshot?.duration ?? 0).toFixed(2)}{" "}
                          {usage.pricingSnapshot?.unitName ?? persistedUnitName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: "var(--fab-text-dim)" }}
                        >
                          Rate
                        </span>
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {formatCurrency(usage.pricingSnapshot?.rate ?? 0)}
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
                          className="text-[12px] font-medium"
                          style={{ color: "var(--fab-text-primary)" }}
                        >
                          {formatCurrency(usage.pricingSnapshot?.timeCost ?? 0)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Material Cost
                    </span>
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {formatCurrency(usage.pricingSnapshot?.materialCost ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Subtotal
                    </span>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {formatCurrency(
                        usage.pricingSnapshot?.subtotal ??
                          usage.snapshot.costAtTime,
                      )}
                    </span>
                  </div>
                </div>
              </div>
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
