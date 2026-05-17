"use client";

import { useState } from "react";
import {
  ProjectTimeline,
  ProjectTimelineStep,
} from "@/components/projects/project-timeline";
import { UploadedFile } from "@/components/file-upload/types";
import { ProjectInfoCard } from "./cards/project-info-card";
import { ReceiptCard } from "./cards/receipt-card";
import { PricingEstimateCard } from "./cards/pricing-estimate-card";
import { WorkshopPricingSummary } from "./cards/workshop-pricing-summary";
import { AttendeeInfoCard } from "./cards/attendee-info-card";
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
  }) => void;
}

// ── Status workflow ──────────────────────────────────────────────────────
export function ProjectDetailsContent({
  project,
  timelineSteps,
  onOpenAssignView: _onOpenAssignView, // eslint-disable-line @typescript-eslint/no-unused-vars
  onUpdateStatus,
  onMarkPaid,
  isClient,
  onUpdateDetails,
}: ProjectDetailsContentProps) {
  // ── Editable fields ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(
    project.description ?? "",
  );
  const [editNotes, setEditNotes] = useState(project.notes ?? "");
  const [editMaterial, setEditMaterial] = useState(project.material);
  const [editServiceType, setEditServiceType] = useState(
    project.fulfillmentMode,
  );
  const [editFiles, setEditFiles] = useState<UploadedFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = !isClient || project.status === "pending";

  function openEdit() {
    setIsEditing(true);
    setEditDescription(project.description ?? "");
    setEditNotes(project.notes ?? "");
    setEditMaterial(project.material);
    setEditServiceType(project.fulfillmentMode);
    setEditFiles(
      (project.resolvedFiles ?? []).map((f) => ({
        storageId: (f as { storageId?: string }).storageId ?? "",
        url: (f as { url?: string }).url ?? "",
        fileName: (f as { originalName?: string }).originalName ?? "file",
        fileType: (f as { type?: string }).type ?? "unknown",
        fileSize: (f as { fileSize?: number }).fileSize ?? 0,
        uploadedAt: new Date(
          (f as { uploadedAt?: number }).uploadedAt ?? Date.now(),
        ),
      })),
    );
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditFiles([]);
  }

  async function saveEdit() {
    if (!onUpdateDetails) return;
    setIsSaving(true);
    try {
      const didUpdate: {
        description?: string;
        notes?: string;
        material?: ProjectMaterialType;
        fulfillmentMode?: FulfillmentModeType;
        files?: string[];
      } = {};
      if (editDescription !== (project.description ?? ""))
        didUpdate.description = editDescription;
      if (editNotes !== (project.notes ?? "")) didUpdate.notes = editNotes;
      if (editMaterial !== project.material) didUpdate.material = editMaterial;
      if (editServiceType !== project.fulfillmentMode)
        didUpdate.fulfillmentMode = editServiceType;
      if (editFiles.length > 0)
        didUpdate.files = editFiles.map((f) => f.storageId);
      await onUpdateDetails(didUpdate);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }

  // ── Derived display values ───────────────────────────────────────────────
  const bookingDateStr = (() => {
    if (project.bookingStartTime == null) return "—";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(project.bookingStartTime));
  })();

  const bookingTimeRange = (() => {
    if (project.bookingStartTime == null) return "—";
    const fmt = (ts: number) =>
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ts));
    const start = fmt(project.bookingStartTime);
    const end = project.bookingEndTime ? fmt(project.bookingEndTime) : start;
    return `${start} – ${end}`;
  })();

  // ── Status workflow ──────────────────────────────────────────────────────
  const workflow = getWorkflow(project.type);
  const allowedTransitions = workflow.transitions[project.status] ?? [];

  async function handleStatusChange(newStatus: ProjectStatusType) {
    onUpdateStatus(newStatus);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── Status timeline ──────────────────────────────────────────────── */}
      <ProjectTimeline steps={timelineSteps} />

      {/* ── Status actions ───────────────────────────────────────────────── */}
      {!isClient && allowedTransitions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {allowedTransitions.map((status: ProjectStatusType) => {
            const label = getStatusLabel(status, project.type);
            const isDestructive =
              status === "rejected" || status === "cancelled";
            const isPrimary = status === "approved" || status === "completed";

            if (status === "paid") {
              return (
                <button
                  key={status}
                  type="button"
                  onClick={onMarkPaid}
                  className="inline-flex h-8 items-center border-2 border-black bg-fab-teal px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
                >
                  {label}
                </button>
              );
            }

            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className={`inline-flex h-8 items-center border-2 border-black px-3 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] ${
                  isPrimary
                    ? "bg-fab-teal text-white"
                    : isDestructive
                      ? "bg-red-100 text-red-800"
                      : "bg-white text-black"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="grid min-w-0 grid-cols-1 gap-5">
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
              <AttendeeInfoCard project={project} />
              <WorkshopPricingSummary project={project} />
            </div>
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
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
