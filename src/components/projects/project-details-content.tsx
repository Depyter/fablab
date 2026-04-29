"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import {
  ProjectTimeline,
  ProjectTimelineStep,
} from "@/components/projects/project-timeline";
import { UploadedFile } from "@/components/file-upload/types";
import { ProjectInfoCard } from "./cards/project-info-card";
import { ReceiptCard } from "./cards/receipt-card";
import { PricingEstimateCard } from "./cards/pricing-estimate-card";
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionDialog } from "../action-dialog";
import { api } from "@/../convex/_generated/api";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TRANSITIONS,
  ProjectStatusType,
  ProjectMaterialType,
  FulfillmentModeType,
} from "@convex/constants";

export type ProjectData = NonNullable<
  (typeof api.projects.query.getProject)["_returnType"]
>;

interface ProjectDetailsContentProps {
  project: ProjectData;
  styles?: { badge?: string; cover?: string };
  timelineSteps: ProjectTimelineStep[];
  onOpenAssignView: () => void;
  onUpdateStatus: (newStatus: ProjectStatusType) => void;
  onMarkPaid: () => void;
  isClient: boolean;
  onCancelProject: () => void;
  onUpdateDetails?: (args: {
    description?: string;
    notes?: string;
    material?: ProjectMaterialType;
    fulfillmentMode?: FulfillmentModeType;
    files?: string[];
  }) => Promise<boolean>;
}

const STATUS_PILL: Record<
  ProjectStatusType,
  { bg: string; color: string; border: string }
> = {
  pending: {
    bg: "var(--fab-amber-light)",
    color: "var(--fab-amber)",
    border: "rgba(235,170,87,0.35)",
  },
  approved: {
    bg: "rgba(59,130,246,0.1)",
    color: "#1d4ed8",
    border: "rgba(59,130,246,0.25)",
  },
  completed: {
    bg: "rgba(16,185,129,0.1)",
    color: "#059669",
    border: "rgba(16,185,129,0.25)",
  },
  paid: {
    bg: "color-mix(in srgb, var(--fab-teal) 12%, white)",
    color: "var(--fab-teal)",
    border: "color-mix(in srgb, var(--fab-teal) 30%, transparent)",
  },
  rejected: {
    bg: "var(--fab-magenta-light)",
    color: "var(--fab-magenta)",
    border: "rgba(157,26,88,0.25)",
  },
  cancelled: {
    bg: "rgba(239,68,68,0.08)",
    color: "#dc2626",
    border: "rgba(239,68,68,0.2)",
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
  // ── Edit state (review stage) ───────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMaterial, setEditMaterial] =
    useState<ProjectMaterialType>("provide-own");
  const [editServiceType, setEditServiceType] =
    useState<FulfillmentModeType>("self-service");
  const [editFiles, setEditFiles] = useState<UploadedFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = project.status === "pending" && !!onUpdateDetails;

  function openEdit() {
    setEditDescription(project.description ?? "");
    setEditNotes(project.notes ?? "");
    setEditMaterial(project.material as ProjectMaterialType);
    setEditServiceType(project.fulfillmentMode as FulfillmentModeType);
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
    const didUpdate = await onUpdateDetails({
      description: editDescription,
      notes: editNotes,
      material: editMaterial,
      fulfillmentMode: editServiceType,
      files: editFiles.map((f) => f.storageId),
    });
    if (didUpdate) {
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  const primaryUsage = project.resourceUsages?.[0];

  const bookingDateStr = primaryUsage?.startTime
    ? new Date(primaryUsage.startTime).toLocaleDateString("en-US", {
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
  const statusOrder = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatusType[];
  const currentIndex = statusOrder.indexOf(project.status);
  const allowedTransitions = PROJECT_STATUS_TRANSITIONS[project.status].filter(
    (status) => status !== "cancelled",
  );

  const previousStep = allowedTransitions
    .filter((status) => statusOrder.indexOf(status) < currentIndex)
    .sort((a, b) => statusOrder.indexOf(b) - statusOrder.indexOf(a))[0];

  const nextStep = allowedTransitions
    .filter((status) => statusOrder.indexOf(status) > currentIndex)
    .sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b))[0];

  const previousStepLabel = previousStep
    ? PROJECT_STATUS_LABELS[previousStep]
    : "";
  const nextStepLabel = nextStep ? PROJECT_STATUS_LABELS[nextStep] : "";
  const isClaimedProject =
    project.status === "paid" || (project.status as string) === "claimed";
  const canRebook = isClient && project.status === "cancelled";
  const canSubmitReview = isClient && isClaimedProject;

  function handleStatusChange(status: ProjectStatusType) {
    if (status === "approved" && project.status === "pending") {
      onOpenAssignView();
      return;
    }

    if (status === "paid") {
      onMarkPaid();
      return;
    }

    onUpdateStatus(status);
  }

  return (
    <div className="min-w-0 space-y-0">
      <div className="space-y-5 pt-5">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="space-y-0 mb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {/* Title + meta chips */}
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle
                  className="text-xl font-bold leading-tight tracking-tight"
                  style={{
                    fontFamily: "Syne, sans-serif",
                    color: "var(--fab-text-primary)",
                  }}
                >
                  {project.name}
                </DialogTitle>
                {/* Override status — next to project name, admin/maker only */}
                {!isClient && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold uppercase tracking-[0.08em] gap-1 rounded-[5px]"
                        style={{
                          background: "var(--fab-magenta-light)",
                          color: "var(--fab-magenta)",
                          border: "1px solid rgba(157,26,88,0.25)",
                        }}
                      >
                        Override
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel className="text-xs font-semibold">
                        Override Status
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {PROJECT_STATUS_TRANSITIONS[project.status].map(
                        (status) => (
                          <DropdownMenuItem
                            key={status}
                            className="text-xs"
                            onClick={() => handleStatusChange(status)}
                          >
                            {PROJECT_STATUS_LABELS[status]}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
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
                  {PROJECT_STATUS_LABELS[project.status]}
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
                  {project.fulfillmentMode}
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
                <>
                  {canRebook ? (
                    <ActionDialog
                      title="Rebook Project Request"
                      description="Do you want to rebook this project request?"
                      onConfirm={() => {}}
                      baseActionText="Rebook Request"
                      cancelButtonText="Back"
                      confirmButtonText="Yes, rebook"
                      className="w-full sm:w-auto"
                      disabled={isClaimedProject}
                    />
                  ) : (
                    <ActionDialog
                      title="Cancel Project Request"
                      description="Do you want to cancel this project request?"
                      onConfirm={() => {}}
                      baseActionText="Cancel   Request"
                      cancelButtonText="Back"
                      confirmButtonText="Yes, cancel"
                      className="w-full sm:w-auto"
                      disabled={isClaimedProject}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* Back · Current state · Next */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold"
                      onClick={() =>
                        previousStep && handleStatusChange(previousStep)
                      }
                      disabled={!previousStep}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      {previousStep ? `Back: ${previousStepLabel}` : "Back"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold"
                      style={{
                        background: "var(--fab-teal)",
                        color: "white",
                        border: `1px solid ${pill.border}`,
                      }}
                      onClick={() => {}}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold"
                      style={{
                        background: pill.bg,
                        color: pill.color,
                        border: `1px solid ${pill.border}`,
                      }}
                      onClick={() => nextStep && handleStatusChange(nextStep)}
                      disabled={!nextStep}
                    >
                      {nextStep ? `Next: ${nextStepLabel}` : "Completed"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
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
              projectType={project.type}
              serviceType={project.fulfillmentMode}
              material={project.material}
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
              totalInvoice={project.totalInvoice ?? undefined}
              pricingSnapshot={project.pricingSnapshot ?? undefined}
              service={project.service ?? undefined}
              serviceType={project.fulfillmentMode}
              resourceUsages={project.resourceUsages}
              projectPricing={project.pricing}
              requestedMaterials={project.requestedMaterials ?? []}
              assignedMaker={project.assignedMaker ?? undefined}
              readOnly={isClient}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
