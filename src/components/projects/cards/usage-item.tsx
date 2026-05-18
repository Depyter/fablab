"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import {
  DateTimePicker,
  type DateTimePickerValue,
} from "@/components/booking/date-time-picker";
import {
  WorkshopTimeSlotPicker,
  type WorkshopTimeSlotValue,
} from "@/components/booking/workshop-time-slot-picker";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  getDurationMinutesFromTimestampRange,
  getDurationUnitsFromMinutes,
} from "@/lib/project-pricing";
import {
  getLabDayKey,
  getLabTimeBlock,
  getLabTimeRangeTimestamps,
} from "@/lib/lab-time";

// --- Types ---

export interface ResourceDetails {
  _id: string | null;
  name: string;
  category?: string | null;
  type?: string | null;
  status?: string | null;
  description?: string | null;
}

export interface ResourceUsage {
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

export interface UsagePricingSnapshot {
  duration: number;
  rate: number;
  timeCost: number;
  materialCost: number;
  setupFeePortion: number;
  subtotal: number;
  unitName: string;
  pricingVariant?: string;
}

export interface UsageDraft {
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

export interface RequestedMaterial {
  _id: string;
  name: string;
  unit: string;
  pricePerUnit?: number;
}

export interface ServiceCategoryWorkshop {
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

export interface ServiceCategoryFabrication {
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
}

export interface PricingService {
  _id: Id<"services">;
  resources?: Id<"resources">[];
  serviceCategory: ServiceCategoryWorkshop | ServiceCategoryFabrication;
  name?: string;
}

export interface EditableResource {
  _id: string;
  name: string;
  category?: string | null;
  type?: string | null;
  status?: string | null;
  description?: string | null;
}

export interface UsagePreview {
  duration: number;
  timeCost: number;
  materialCost: number;
  subtotal: number;
  unitName: string;
}

// --- Utils ---

export function nearlyEqual(left: number, right: number) {
  return Math.abs(left - right) <= 0.0001;
}

export function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every(
    (value, index) => value === normalizedRight[index],
  );
}

export function toMaterialAmountMap(
  materialsUsed?: Array<{ materialId: string; amountUsed: number }>,
) {
  const amounts: Record<string, number> = {};
  for (const material of materialsUsed ?? []) {
    amounts[material.materialId] = material.amountUsed;
  }
  return amounts;
}

export function sortUsages(usages: ResourceUsage[]) {
  return [...usages].sort(
    (left, right) =>
      left.startTime - right.startTime || left._id.localeCompare(right._id),
  );
}

export function buildUsageDraft(
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

export function isPastBookingRange(startTime: number) {
  return startTime < Date.now();
}

export function formatCurrency(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

export function formatUsageDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatUsageTimeRange(startTime: number, endTime: number) {
  return `${new Date(startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${new Date(endTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildTimestamp(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

export function buildBookingRange(
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

export function parseDraftDate(dateValue: string) {
  if (!dateValue) return undefined;

  const timestamp = buildTimestamp(dateValue, "00:00");
  if (Number.isNaN(timestamp)) return undefined;

  return new Date(timestamp);
}

export function getDraftMaterialIds(draft: UsageDraft) {
  return Object.keys(draft.materialAmounts).sort();
}

export function computeUsagePreview(
  draft: UsageDraft,
  pricingType: "WORKSHOP" | "FABRICATION",
  materialLookup: Map<string, RequestedMaterial>,
): UsagePreview {
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

export function computePeerTimeBlocks(
  allDrafts: UsageDraft[],
  draft: UsageDraft,
  currentLabDate: Date | undefined,
): { start: string; end: string }[] {
  return allDrafts
    .filter((peer) => peer.key !== draft.key)
    .filter((peer) => {
      const peerDate = parseDraftDate(peer.date);
      if (!peerDate || !currentLabDate) return false;
      return getLabDayKey(peerDate) === getLabDayKey(currentLabDate);
    })
    .filter((peer) => !draft.resourceId || peer.resourceId === draft.resourceId)
    .filter(
      (peer) =>
        peer.startTime !== "" &&
        peer.endTime !== "" &&
        peer.startTime < peer.endTime,
    )
    .map((peer) => {
      const peerDate = parseDraftDate(peer.date);
      if (!peerDate) return null;
      const range = getLabTimeRangeTimestamps({
        date: peerDate,
        startTime: peer.startTime,
        endTime: peer.endTime,
      });
      return getLabTimeBlock({
        startTime: range.startTime,
        endTime: range.endTime,
      });
    })
    .filter((block): block is { start: string; end: string } => block !== null);
}

const NO_RESOURCE_VALUE = "__no_resource__";
const NO_MATERIAL_VALUE = "__no_material__";

// --- Components ---

interface UsageScheduleEditorProps {
  draft: UsageDraft;
  service: PricingService;
  allDrafts: UsageDraft[];
  onChange: (nextValue: DateTimePickerValue | WorkshopTimeSlotValue) => void;
}

function UsageScheduleEditor({
  draft,
  service,
  allDrafts,
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

  const peerTimeBlocks = computePeerTimeBlocks(allDrafts, draft, dateValue);

  const mergedBookedTimeBlocks = [
    ...(bookedSlots ?? [])
      .filter((slot) => slot.usageId !== draft.usageId)
      .map((slot) => getLabTimeBlock(slot)),
    ...peerTimeBlocks,
  ];

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
      bookedTimeBlocks={mergedBookedTimeBlocks}
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

interface UsageDraftItemProps {
  draft: UsageDraft;
  index: number;
  pricingType: "WORKSHOP" | "FABRICATION";
  preview: UsagePreview;
  service: PricingService;
  editableResources: EditableResource[];
  editableMaterialDocs: RequestedMaterial[];
  isBuyFromLab: boolean;
  allDrafts: UsageDraft[];
  onRemove: () => void;
  onUpdateDraft: (updater: (draft: UsageDraft) => UsageDraft) => void;
}

export function UsageDraftItem({
  draft,
  index,
  pricingType,
  preview,
  service,
  editableResources,
  editableMaterialDocs,
  isBuyFromLab,
  allDrafts,
  onRemove,
  onUpdateDraft,
}: UsageDraftItemProps) {
  return (
    <div
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
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {editableResources.length > 0 && (
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
              onUpdateDraft((currentDraft) => ({
                ...currentDraft,
                resourceId: value === NO_RESOURCE_VALUE ? "" : value,
              }))
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select a resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_RESOURCE_VALUE}>No resource</SelectItem>
              {editableResources.map((resourceDoc) => (
                <SelectItem key={resourceDoc._id} value={resourceDoc._id}>
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
          allDrafts={allDrafts}
          onChange={(nextValue) =>
            onUpdateDraft((currentDraft) => ({
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
            {pricingType === "WORKSHOP" ? "Amount" : "Setup Fee Portion"}
          </p>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={draft.setupFeePortion}
            onChange={(event) =>
              onUpdateDraft((currentDraft) => ({
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
                onUpdateDraft((currentDraft) => ({
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

      {isBuyFromLab && editableMaterialDocs.length > 0 && (
        <UsageMaterialEditor
          draft={draft}
          materialOptions={editableMaterialDocs}
          onAddMaterial={(materialId) =>
            onUpdateDraft((currentDraft) => ({
              ...currentDraft,
              materialAmounts: {
                ...currentDraft.materialAmounts,
                [materialId]: currentDraft.materialAmounts[materialId] ?? 0,
              },
            }))
          }
          onUpdateAmount={(materialId, amountUsed) =>
            onUpdateDraft((currentDraft) => ({
              ...currentDraft,
              materialAmounts: {
                ...currentDraft.materialAmounts,
                [materialId]: amountUsed,
              },
            }))
          }
          onRemoveMaterial={(materialId) =>
            onUpdateDraft((currentDraft) => {
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
}

interface UsageReadOnlyItemProps {
  usage: ResourceUsage;
  index: number;
  pricingType: "WORKSHOP" | "FABRICATION";
  isBuyFromLab: boolean;
  persistedUnitName: string;
}

export function UsageReadOnlyItem({
  usage,
  index,
  pricingType,
  isBuyFromLab,
  persistedUnitName,
}: UsageReadOnlyItemProps) {
  return (
    <div
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
            usage.pricingSnapshot?.subtotal ?? usage.snapshot.costAtTime,
          )}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
          <p className="text-[10px]" style={{ color: "var(--fab-text-muted)" }}>
            {formatUsageTimeRange(usage.startTime, usage.endTime)}
          </p>
        </div>
      </div>

      {isBuyFromLab && (
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
                    {materialEntry.amountUsed} {materialEntry.unit ?? "units"}
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
            {pricingType === "WORKSHOP" ? "Amount" : "Setup Fee Portion"}
          </span>
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--fab-text-primary)" }}
          >
            {formatCurrency(usage.pricingSnapshot?.setupFeePortion ?? 0)}
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
              usage.pricingSnapshot?.subtotal ?? usage.snapshot.costAtTime,
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
