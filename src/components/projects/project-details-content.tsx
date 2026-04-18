"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldSeparator } from "@/components/ui/field";
import {
  ProjectTimeline,
  ProjectTimelineStep,
} from "@/components/projects/project-timeline";
import { ProjectAttachments } from "@/components/projects/project-attachments";
import { PricingEstimateCard } from "./pricing-estimate-card";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Circle,
  Banknote,
  MoreHorizontal,
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
}: ProjectDetailsContentProps) {
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
        <DialogHeader className="space-y-0">
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
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenAssignView}
                    disabled={project.status === "approved"}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateStatus("completed")}
                    disabled={
                      project.status === "completed" ||
                      project.status === "paid"
                    }
                    className="gap-1.5 h-8 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    onClick={onMarkPaid}
                    disabled={
                      project.status !== "completed" &&
                      project.status !== "paid"
                    }
                    className="gap-1.5 h-8 text-xs"
                    style={{ background: "var(--fab-teal)", color: "#fff" }}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    {project.status === "paid"
                      ? "Update Payment"
                      : "Mark as Paid"}
                  </Button>
                  {/* Overflow: Pending + Reject */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onUpdateStatus("pending")}
                        disabled={project.status === "pending"}
                      >
                        <Circle className="mr-2 h-4 w-4" /> Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onUpdateStatus("rejected")}
                        disabled={project.status === "rejected"}
                        className="text-red-600 focus:text-red-600"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject Request
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {project.roomId && project.threadId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-xs w-full sm:w-auto"
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
                  className="gap-1.5 h-8 text-xs w-full sm:w-auto"
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
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--fab-text-dim)" }}
                >
                  Project Details
                </span>
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
                  <p
                    className="wrap-break-word whitespace-pre-line text-sm"
                    style={{ color: "var(--fab-text-primary)" }}
                  >
                    {project.description}
                  </p>
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
                    <p
                      className="text-sm capitalize"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {project.serviceType}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      Material
                    </p>
                    <p
                      className="text-sm capitalize"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {project.material}
                    </p>
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
                <ProjectAttachments
                  files={(project.resolvedFiles ?? [])
                    .filter((f) => !!f.url)
                    .map((f) => ({
                      url: f.url!,
                      type: f.type,
                      originalName: f.originalName,
                    }))}
                />
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
