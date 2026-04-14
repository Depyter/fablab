import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import {
  ProjectTimeline,
  ProjectTimelineStep,
} from "@/components/projects/project-timeline";
import { Label } from "@/components/ui/label";
import { MessageAttachments } from "@/components/chat/parts/message-attachments";
import { PricingEstimateCard } from "./pricing-estimate-card";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react";
import Link from "next/link";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActionDialog } from "../action-dialog";
import { api } from "@/../convex/_generated/api";

export type ProjectData = NonNullable<
  (typeof api.projects.query.getProject)["_returnType"]
>;

interface ProjectDetailsContentProps {
  project: ProjectData;
  bookingDate?: number;
  bookingTime?: number;
  styles: { badge: string; cover: string };
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
  isClient: boolean;
  onCancelProject: () => void;
}

export function ProjectDetailsContent({
  project,
  bookingDate,
  bookingTime,
  styles,
  timelineSteps,
  onOpenAssignView,
  onUpdateStatus,
  isClient,
  onCancelProject,
}: ProjectDetailsContentProps) {
  return (
    <div className="space-y-4">
      <DialogHeader className="space-y-3">
        <DialogTitle className="flex flex-col gap-2 text-xl sm:flex-row sm:items-center sm:justify-between">
          {project.name}
        </DialogTitle>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Update Status <ChevronDown className="ml-2 h-4 w-4" />
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
                  onClick={onOpenAssignView}
                  disabled={project.status === "approved"}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-blue-500" /> Approve
                  & Assign
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatus("completed")}
                  disabled={project.status === "completed"}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />{" "}
                  Complete Project
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
          )}
          {project.roomId && project.threadId ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              asChild
            >
              <Link
                href={`/dashboard/chat/${project.roomId}?thread=${project.threadId}`}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Client
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Message Client
            </Button>
          )}
        </div>
      </DialogHeader>

      <FieldSeparator className="mb-4 sm:mb-5" />

      <ProjectTimeline steps={timelineSteps} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-10 min-w-0">
        <div className="lg:col-span-7 space-y-4 min-w-0">
          <Card>
            <CardContent className="space-y-3 sm: min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold sm:text-lg">
                  Project Overview
                </h3>
                <span
                  className={cn(
                    "text-sm font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border backdrop-blur-sm bg-background/70",
                    styles.badge,
                  )}
                >
                  {project.status}
                </span>
              </div>

              <FieldGroup>
                <Field className="gap-1">
                  <Label className="text-muted-foreground text-xs font-normal">
                    Description
                  </Label>
                  <p className="wrap-break-word text-sm whitespace-pre-line">
                    {project.description}
                  </p>
                </Field>
              </FieldGroup>
              <FieldSeparator className="mb-2" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 min-w-0">
                <FieldGroup>
                  <Field className="gap-1">
                    <Label className="text-muted-foreground text-xs font-normal">
                      Service Type
                    </Label>
                    <p className="text-sm uppercase">{project.serviceType}</p>
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field className="gap-1">
                    <Label className="text-muted-foreground text-xs font-normal">
                      Material
                    </Label>
                    <p className="text-sm uppercase">{project.material}</p>
                  </Field>
                </FieldGroup>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 min-w-0">
                <FieldGroup>
                  <Field className="gap-1">
                    <Label className="text-muted-foreground text-xs font-normal">
                      Requested Date
                    </Label>
                    <p className="text-sm uppercase">
                      {bookingDate
                        ? new Date(bookingDate).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field className="gap-1">
                    <Label className="text-muted-foreground text-xs font-normal">
                      Deadline
                    </Label>
                    <p className="text-sm uppercase">
                      {bookingTime
                        ? new Date(bookingTime).toLocaleTimeString()
                        : "Not specified"}
                    </p>
                  </Field>
                </FieldGroup>
              </div>
              <FieldGroup>
                <Field className="gap-1">
                  <Label className="text-muted-foreground text-xs font-normal">
                    Estimated Duration
                  </Label>
                  <p className="text-sm">
                    {project.resourceUsages && project.resourceUsages.length > 0
                      ? `${(
                          project.resourceUsages.reduce(
                            (acc: number, u) => acc + (u.endTime - u.startTime),
                            0,
                          ) /
                          (1000 * 60 * 60)
                        ).toFixed(1)} hours`
                      : "Not specified"}
                  </p>
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <p className="text-sm text-muted-foreground">
                    {project.notes || "No notes provided"}
                  </p>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 sm:min-w-0">
              <h3 className="text-base font-semibold sm:text-lg">
                File Uploads
              </h3>
              {project.resolvedFiles && project.resolvedFiles.length > 0 ? (
                <MessageAttachments
                  files={project.resolvedFiles
                    .filter((f) => !!f.url)
                    .map((f) => ({
                      fileUrl: f.url!,
                      fileType: f.type,
                      originalName: f.originalName,
                    }))}
                  isCurrentUser={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No files uploaded.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6 min-w-0">
          <Card>
            <CardContent className="space-y-4 sm:min-w-0">
              <h3 className="text-base font-semibold sm:text-lg">
                Assigned Makers
              </h3>
              {project.resourceUsages.length === 0 ||
              !project.resourceUsages.some((u) => u.makerName) ? (
                <p className="text-sm text-muted-foreground">
                  No makers assigned yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {project.resourceUsages
                    .filter((usage) => usage.makerName)
                    .map((usage, idx: number) => (
                      <div
                        key={`maker-${idx}`}
                        className="flex items-center gap-3 rounded-md bg-muted/80 p-3 min-w-0"
                      >
                        {usage.makerPfpUrl ? (
                          <img
                            src={usage.makerPfpUrl}
                            alt={usage.makerName ?? ""}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                            {usage.makerName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="wrap-break-word text-sm font-medium">
                          {usage.makerName}
                        </p>
                      </div>
                    ))}
                </div>
              )}

              <FieldSeparator className="my-2" />

              <h3 className="text-base font-semibold sm:text-lg">
                Resource Usage
              </h3>
              {project.resourceUsages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No usage records yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {project.resourceUsages.map((usage) => (
                    <div
                      key={usage._id}
                      className="flex gap-4 rounded-md bg-muted/80 p-3 min-w-0"
                    >
                      {usage.resourceDetails?.imageUrls?.[0] ? (
                        <img
                          src={usage.resourceDetails.imageUrls[0]}
                          alt={usage.resourceDetails.name}
                          className="h-16 w-16 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-secondary/50 text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}

                      <div className="flex min-w-0 flex-col">
                        <p className="wrap-break-word text-sm font-medium">
                          {usage.resourceDetails?.name ?? "Unassigned resource"}
                        </p>
                        {usage.resourceDetails?.category && (
                          <p className="text-xs capitalize text-muted-foreground">
                            {usage.resourceDetails.category}
                          </p>
                        )}

                        {usage.materialsUsed &&
                          usage.materialsUsed.length > 0 && (
                            <p className="mt-1.5 wrap-break-word text-xs text-muted-foreground">
                              Material used: {usage.materialsUsed[0].amountUsed}{" "}
                              units
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <PricingEstimateCard
            material={project.material}
            service={project.service ?? undefined}
            resourceUsages={project.resourceUsages}
            readOnly={isClient}
          />

          {project.receipt && (
            <Card>
              <CardContent className="space-y-3 p-4 sm:p-6 min-w-0">
                <h3 className="text-sm font-semibold">Payment Receipt</h3>
                <FieldGroup>
                  <Field>
                    <Label>Receipt Number</Label>
                    <p className="wrap-break-word text-sm">
                      {project.receipt.receiptNumber.toString()}
                    </p>
                  </Field>
                  <Field>
                    <Label>Payment Mode</Label>
                    <p className="wrap-break-word text-sm">
                      {project.receipt.paymentMode}
                    </p>
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field>
                    <Label>Proof</Label>
                    <p className="wrap-break-word text-sm text-muted-foreground">
                      {project.receipt.proof || "No proof details"}
                    </p>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
