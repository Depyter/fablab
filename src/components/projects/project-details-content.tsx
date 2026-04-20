"use client";

import { useState } from "react";
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
  ProjectTimeline,
  ProjectTimelineStep,
} from "@/components/projects/project-timeline";
import { UploadedFile } from "@/components/file-upload/types";
import { ProjectInfoCard } from "./cards/project-info-card";
import { ReceiptCard } from "./cards/receipt-card";
import { PricingEstimateCard } from "./cards/pricing-estimate-card";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionDialog } from "../action-dialog";
import { api } from "@/../convex/_generated/api";

export type ProjectData = NonNullable<
  (typeof api.projects.query.getProject)["_returnType"]
>;

interface ProjectDetailsContentProps {
  project: ProjectData;
  styles?: { badge?: string; cover?: string };
  timelineSteps: ProjectTimelineStep[];
  onOpenAssignView: () => void;
  onUpdateStatus: (
    newStatus:
      | "pending"
      | "approved"
      | "rejected"
      | "completed"
      | "cancellation_requested"
      | "cancelled"
      | string,
  ) => void;
  onMarkPaid: () => void;
  isClient: boolean;
  onCancelProject: () => void;
  onUpdateDetails?: (args: {
    description?: string;
    notes?: string;
    material?: "provide-own" | "buy-from-lab";
    serviceType?: "self-service" | "full-service" | "workshop";
    files?: string[];
  }) => Promise<void>;
}

const STATUS_PILL: Record<
  string,
  { bg: string; color: string; border: string; label: string }
> = {
  pending: {
    bg: "var(--fab-amber-light)",
    color: "var(--fab-amber)",
    border: "rgba(235,170,87,0.35)",
    label: "Pending",
  },
  approved: {
    bg: "rgba(59,130,246,0.1)",
    color: "#1d4ed8",
    border: "rgba(59,130,246,0.25)",
    label: "Approved",
  },
  completed: {
    bg: "rgba(16,185,129,0.1)",
    color: "#059669",
    border: "rgba(16,185,129,0.25)",
    label: "Completed",
  },
  paid: {
    bg: "color-mix(in srgb, var(--fab-teal) 12%, white)",
    color: "var(--fab-teal)",
    border: "color-mix(in srgb, var(--fab-teal) 30%, transparent)",
    label: "Paid",
  },
  rejected: {
    bg: "var(--fab-magenta-light)",
    color: "var(--fab-magenta)",
    border: "rgba(157,26,88,0.25)",
    label: "Rejected",
  },
  cancelled: {
    bg: "rgba(239,68,68,0.08)",
    color: "#dc2626",
    border: "rgba(239,68,68,0.2)",
    label: "Cancelled",
  },
};

export function ProjectDetailsContent({
  project,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  styles: _styles,
  timelineSteps,
  onOpenAssignView,
  onUpdateStatus,
  onMarkPaid,
  isClient,
  onCancelProject,
  onUpdateDetails,
}: ProjectDetailsContentProps) {
  // ── Edit state (client only, pending projects) ──────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMaterial, setEditMaterial] = useState<
    "provide-own" | "buy-from-lab"
  >("provide-own");
  const [editServiceType, setEditServiceType] = useState<
    "self-service" | "full-service" | "workshop"
  >("self-service");
  const [editFiles, setEditFiles] = useState<UploadedFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isClient && project.status === "pending" && !!onUpdateDetails;

  function openEdit() {
    setEditDescription(project.description ?? "");
    setEditNotes(project.notes ?? "");
    setEditMaterial(project.material as "provide-own" | "buy-from-lab");
    setEditServiceType(
      project.serviceType as "self-service" | "full-service" | "workshop",
    );
    setEditFiles(
      (project.resolvedFiles ?? [])
        .filter((f) => !!f.url)
        .map((f) => ({
          storageId: f.storageId as string,
          url: f.url ?? undefined,
          fileName: f.originalName ?? "file",
          fileType: f.type ?? "",
          fileSize: 0,
          uploadedAt: new Date(),
        })),
    );
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  async function saveEdit() {
    if (!onUpdateDetails) return;
    setIsSaving(true);
    try {
      await onUpdateDetails({
        description: editDescription,
        notes: editNotes,
        material: editMaterial,
        serviceType: editServiceType,
        files: editFiles.map((f) => f.storageId),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  const primaryUsage = project.resourceUsages?.[0];

  const bookingDateStr = primaryUsage?.date
    ? new Date(primaryUsage.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not specified";

  const bookingTimeRange = primaryUsage
    ? `${new Date(primaryUsage.startTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${new Date(primaryUsage.endTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Not specified";

  const pill = STATUS_PILL[project.status] ?? STATUS_PILL.pending;

  return (
    <div className="min-w-0 space-y-0">
      <div className="space-y-5 pt-5">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="space-y-0 mb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {/* Title + meta chips */}
            <div className="min-w-0 space-y-2">
              <DialogTitle
                className="text-xl font-bold leading-tight tracking-tight"
                style={{
                  fontFamily: "Syne, sans-serif",
                  color: "var(--fab-text-primary)",
                }}
              >
                {project.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Status pill */}
                <span
                  className="inline-flex items-center rounded-[5px] px-[8px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: pill.bg,
                    color: pill.color,
                    border: `1px solid ${pill.border}`,
                  }}
                >
                  {pill.label}
                </span>
                {/* Service type chip */}
                <span
                  className="inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: "var(--fab-bg-sidebar)",
                    color: "var(--fab-text-muted)",
                    border: "1px solid var(--fab-border-md)",
                  }}
                >
                  {project.serviceType}
                </span>
                {/* Material chip */}
                <span
                  className="inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: "var(--fab-amber-light)",
                    color: "var(--fab-amber)",
                    border: "rgba(235,170,87,0.3) 1px solid",
                  }}
                >
                  {project.material === "buy-from-lab"
                    ? "Lab Material"
                    : "Own Material"}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isClient ? (
                <ActionDialog
                  title="Cancel Project Request"
                  description="Do you want to cancel this project request? This cannot be undone."
                  onConfirm={onCancelProject}
                  baseActionText="Cancel Request"
                  cancelButtonText="Back"
                  confirmButtonText="Yes, cancel"
                  className="w-full sm:w-auto"
                />
              ) : (
                <Select
                  value={project.status}
                  onValueChange={(val) => {
                    if (val === "approved") onOpenAssignView();
                    else if (val === "paid") onMarkPaid();
                    else onUpdateStatus(val);
                  }}
                >
                  <SelectTrigger
                    className="h-8 w-auto gap-2 px-3 text-xs font-semibold"
                    style={{
                      background: pill.bg,
                      color: pill.color,
                      border: `1px solid ${pill.border}`,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {project.roomId && project.threadId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  asChild
                >
                  <Link
                    href={`/dashboard/chat/${project.roomId}?thread=${project.threadId}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {isClient ? "Message Staff" : "Message Client"}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  disabled
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {isClient ? "Message Staff" : "Message Client"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <FieldSeparator className="my-0" />

        <ProjectTimeline steps={timelineSteps} />

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ── Left column ───────────────────────────────────────────── */}
          <div className="min-w-0 space-y-4 lg:col-span-7">
            <ProjectInfoCard
              description={project.description}
              serviceType={project.serviceType}
              material={project.material}
              notes={project.notes}
              bookingDateStr={bookingDateStr}
              bookingTimeRange={bookingTimeRange}
              resolvedFiles={project.resolvedFiles}
              canEdit={canEdit}
              isEditing={isEditing}
              isSaving={isSaving}
              onEdit={openEdit}
              onSave={saveEdit}
              onCancel={cancelEdit}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editNotes={editNotes}
              setEditNotes={setEditNotes}
              editFiles={editFiles}
              setEditFiles={setEditFiles}
              editMaterial={editMaterial}
              setEditMaterial={setEditMaterial}
              editServiceType={editServiceType}
              setEditServiceType={setEditServiceType}
            />

            {!isClient && (
              <ReceiptCard
                receipt={project.receipt}
                status={project.status}
                onMarkPaid={onMarkPaid}
              />
            )}
          </div>

          {/* ── Right column ──────────────────────────────────────────── */}
          <div className="min-w-0 space-y-4 lg:col-span-5">
            <PricingEstimateCard
              projectId={project._id}
              material={project.material}
              costBreakdown={project.costBreakdown ?? undefined}
              service={project.service ?? undefined}
              resourceUsages={project.resourceUsages}
              projectPricing={project.pricing}
              requestedMaterial={project.requestedMaterial ?? undefined}
              requestedMaterialId={project.requestedMaterialId ?? undefined}
              assignedMaker={project.assignedMaker ?? undefined}
              readOnly={isClient}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
