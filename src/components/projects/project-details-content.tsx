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
import { WorkshopPricingSummary } from "./cards/workshop-pricing-summary";
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
import { api } from "@/../convex/_generated/api";
import {
  ProjectStatusType,
  ProjectMaterialType,
  FulfillmentModeType,
} from "@convex/constants";
import { getWorkflow, getStatusLabel } from "@/lib/project-type-meta";

export type ProjectData = NonNullable<
  (typeof api.projects.query.getProject)["_returnType"]
>;

interface ProjectDetailsContentProps {
  project: ProjectData;
  timelineSteps: ProjectTimelineStep[];
  onOpenAssignView: () => void;
  onUpdateStatus: (newStatus: ProjectStatusType) => void;
  onMarkPaid: () => void;
  isClient: boolean;
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
    border: "rgba(59,130,246,0.1)",
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
  claimed: {
    bg: "rgba(15,23,42,0.08)",
    color: "#0f172a",
    border: "rgba(15,23,42,0.18)",
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
  timelineSteps,
  onOpenAssignView,
  onUpdateStatus,
  onMarkPaid,
  isClient,
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

  const canEdit =
    !!onUpdateDetails && (!isClient || project.status === "pending");

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

  const bookingDateStr = project.bookingStartTime
    ? new Date(project.bookingStartTime).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not specified";

  const bookingTimeRange =
    project.bookingStartTime && project.bookingEndTime
      ? `${new Date(project.bookingStartTime).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${new Date(project.bookingEndTime).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "Not specified";

  const pill = STATUS_PILL[project.status] ?? STATUS_PILL.pending;
  const workflow = getWorkflow(project.type);
  const workflowStatuses = workflow.steps;
  // Derive status order from the type-aware workflow.
  // Workflow statuses come first in timeline order, then the
  // remaining canonical statuses (rejected, cancelled, claimed
  // when not already present).
  const statusOrder: ProjectStatusType[] = [
    ...workflowStatuses,
    ...(["rejected", "cancelled", "claimed"] as ProjectStatusType[]).filter(
      (s) => !workflowStatuses.includes(s),
    ),
  ];
  const currentIndex = statusOrder.indexOf(project.status);
  // Exclude "cancelled" (has its own UI) and statuses not valid for this
  // project type — "rejected" is allowed for all types; "claimed" is only
  // valid if it appears in the type's workflow (i.e. fabrication, not workshop).
  const allowedTransitions = workflow.transitions[project.status].filter(
    (status) =>
      status !== "cancelled" &&
      (workflowStatuses.includes(status) || status === "rejected"),
  );

  const previousStep = allowedTransitions
    .filter((status) => statusOrder.indexOf(status) < currentIndex)
    .sort((a, b) => statusOrder.indexOf(b) - statusOrder.indexOf(a))[0];

  const nextStep = allowedTransitions
    .filter((status) => statusOrder.indexOf(status) > currentIndex)
    .sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b))[0];

  const previousStepLabel = previousStep
    ? getStatusLabel(previousStep, project.type)
    : "";
  const nextStepLabel = nextStep ? getStatusLabel(nextStep, project.type) : "";

  function handleStatusChange(status: ProjectStatusType) {
    if (status === "approved" && project.status === "pending") {
      if (workflow.approvalRequiresMaker) {
        onOpenAssignView();
        return;
      }
      onUpdateStatus(status);
      return;
    }

    if (status === "paid") {
      if (project.receipt) {
        // Already has a receipt — just update status without payment dialog
        onUpdateStatus(status);
        return;
      }
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
                        className="h-6 px-2 text-[10px] font-bold uppercase tracking-[0.08em] gap-1 rounded-[5px] cursor-pointer"
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
                      {workflow.transitions[project.status].map((status) => (
                        <DropdownMenuItem
                          key={status}
                          className="text-xs"
                          onClick={() => handleStatusChange(status)}
                        >
                          {getStatusLabel(status, project.type)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isClient && (
                <>
                  {/* Back · Current state · Next */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold cursor-pointer"
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
                      {getStatusLabel(project.status, project.type)}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold cursor-pointer"
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
                    href={`/dashboard/chat/${project.roomId}/${project.threadId}`}
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

        {/* ── Workshop layout ──────────────────────────────────────────── */}
        {project.type === "WORKSHOP" ? (
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
            {/* ── Left column ──────────────────────────────────────── */}
            <div className="min-w-0 space-y-4 lg:col-span-7">
              <ProjectInfoCard
                description={project.description}
                serviceType={project.fulfillmentMode}
                material={project.material}
                bookingDateStr={bookingDateStr}
                bookingTimeRange={bookingTimeRange}
                resolvedFiles={project.resolvedFiles}
                submittedBy={project.client?.name}
                submittedAt={project.requestedDate}
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
                hideServiceType
                workshop
              />

              {!isClient && (
                <ReceiptCard
                  receipt={project.receipt}
                  status={project.status}
                  projectType={project.type}
                  onMarkPaid={onMarkPaid}
                />
              )}
            </div>

            {/* ── Right column ─────────────────────────────────────── */}
            <div className="min-w-0 space-y-4 lg:col-span-5">
              <WorkshopPricingSummary project={project} />
            </div>
          </div>
        ) : (
          /* ── Fabrication layout (unchanged) ──────────────────────────── */
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
            {/* ── Left column ───────────────────────────────────────────── */}
            <div className="min-w-0 space-y-4 lg:col-span-7">
              <ProjectInfoCard
                description={project.description}
                serviceType={project.fulfillmentMode}
                material={project.material}
                bookingDateStr={bookingDateStr}
                bookingTimeRange={bookingTimeRange}
                resolvedFiles={project.resolvedFiles}
                submittedBy={project.client?.name}
                submittedAt={project.requestedDate}
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
                  projectType={project.type}
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
                assignedMaker={project.assignedMaker ?? undefined}
                headlineBookingStartTime={project.bookingStartTime}
                headlineBookingEndTime={project.bookingEndTime}
                readOnly={isClient}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
