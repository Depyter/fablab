"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { ProjectAttachments } from "@/components/projects/project-attachments";
import { FileUpload } from "@/components/file-upload/file-upload";
import { UploadedFile } from "@/components/file-upload/types";
import { PricingEstimateCard } from "./pricing-estimate-card";
import {
  MessageSquare,
  Pencil,
  X as XIcon,
  Save,
} from "lucide-react";
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
  const fileCount = (project.resolvedFiles ?? []).filter((f) => !!f.url).length;

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
                    Message Client
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
                  Message Client
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
            {/* Project details card */}
            <div
              className="overflow-hidden rounded-xl"
              style={{ border: "1px solid var(--fab-border-md)" }}
            >
              <div
                className="flex items-center px-4 py-2.5"
                style={{
                  background: "var(--fab-bg-sidebar)",
                  borderBottom: "1px solid var(--fab-border-md)",
                }}
              >
                <span
                  className="flex-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Project Details
                </span>
                {canEdit && !isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={openEdit}
                    aria-label="Edit project details"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isEditing && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      aria-label="Cancel edit"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      className="h-6 w-6"
                      onClick={saveEdit}
                      disabled={isSaving}
                      aria-label="Save changes"
                      style={{ background: "var(--fab-teal)", color: "#fff" }}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div
                className="space-y-4 px-4 py-4"
                style={{ background: "var(--fab-bg-card)" }}
              >
                {/* Description */}
                <div className="space-y-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fab-text-dim)" }}
                  >
                    Description
                  </p>
                  {isEditing ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="text-sm"
                      placeholder="Project description…"
                    />
                  ) : (
                    <p
                      className="wrap-break-word whitespace-pre-line text-sm"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {project.description}
                    </p>
                  )}
                </div>

                <div
                  className="h-px"
                  style={{ background: "var(--fab-border-soft)" }}
                />

                {/* Service type + material */}
                <div className="grid min-w-0 grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Service Type
                    </p>
                    {isEditing ? (
                      <Select
                        value={editServiceType}
                        onValueChange={(v) =>
                          setEditServiceType(
                            v as "self-service" | "full-service" | "workshop",
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self-service">
                            Self Service
                          </SelectItem>
                          <SelectItem value="full-service">
                            Full Service
                          </SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p
                        className="text-sm capitalize"
                        style={{ color: "var(--fab-text-primary)" }}
                      >
                        {project.serviceType}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Material
                    </p>
                    {isEditing ? (
                      <Select
                        value={editMaterial}
                        onValueChange={(v) =>
                          setEditMaterial(v as "provide-own" | "buy-from-lab")
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provide-own">
                            Provide Own
                          </SelectItem>
                          <SelectItem value="buy-from-lab">
                            Buy from Lab
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p
                        className="text-sm capitalize"
                        style={{ color: "var(--fab-text-primary)" }}
                      >
                        {project.material}
                      </p>
                    )}
                  </div>
                </div>

                {/* Booking date + time */}
                <div className="grid min-w-0 grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Booking Date
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {bookingDateStr}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Time Range
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {bookingTimeRange}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div
                  className="h-px"
                  style={{ background: "var(--fab-border-soft)" }}
                />
                <div className="space-y-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fab-text-dim)" }}
                  >
                    Notes
                  </p>
                  {isEditing ? (
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder="Additional notes…"
                    />
                  ) : (
                    <p
                      className="text-sm"
                      style={{
                        color: project.notes
                          ? "var(--fab-text-muted)"
                          : "var(--fab-text-dim)",
                      }}
                    >
                      {project.notes || "No notes provided"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Attachments card */}
            <div
              className="overflow-hidden rounded-xl"
              style={{ border: "1px solid var(--fab-border-md)" }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  background: "var(--fab-bg-sidebar)",
                  borderBottom: "1px solid var(--fab-border-md)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Attachments
                </span>
                {fileCount > 0 && (
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--fab-text-dim)" }}
                  >
                    {fileCount}
                  </span>
                )}
              </div>
              <div
                className="px-4 py-3"
                style={{ background: "var(--fab-bg-card)" }}
              >
                {isEditing ? (
                  <FileUpload
                    value={editFiles}
                    onFilesChange={setEditFiles}
                    variant="minimal"
                    title="Add files"
                    multiple
                  />
                ) : (
                  <ProjectAttachments
                    files={(project.resolvedFiles ?? [])
                      .filter((f) => !!f.url)
                      .map((f) => ({
                        url: f.url!,
                        type: f.type,
                        originalName: f.originalName,
                      }))}
                  />
                )}
              </div>
            </div>

            {/* Receipt card */}
            {project.receipt && (
              <div
                className="overflow-hidden rounded-xl"
                style={{ border: "1px solid var(--fab-border-md)" }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{
                    background:
                      "color-mix(in srgb, var(--fab-teal) 7%, var(--fab-bg-sidebar))",
                    borderBottom: "1px solid var(--fab-border-md)",
                  }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fab-teal)" }}
                  >
                    Payment Receipt
                  </span>
                  <span
                    className="ml-auto inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      background:
                        "color-mix(in srgb, var(--fab-teal) 14%, white)",
                      color: "var(--fab-teal)",
                    }}
                  >
                    Paid
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4"
                  style={{ background: "var(--fab-bg-card)" }}
                >
                  <div className="space-y-0.5">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Receipt Number
                    </p>
                    <p
                      className="wrap-break-word text-sm font-medium"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {project.receipt.receiptNumber.toString()}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Payment Mode
                    </p>
                    <p
                      className="text-sm capitalize"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {project.receipt.paymentMode}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-0.5">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Proof
                    </p>
                    <p
                      className="wrap-break-word text-sm"
                      style={{ color: "var(--fab-text-muted)" }}
                    >
                      {project.receipt.proof || "No proof details"}
                    </p>
                  </div>
                </div>
              </div>
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
