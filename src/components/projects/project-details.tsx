"use client";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { STATUS_STYLES } from "./project-card";
import { PricingEstimateCard } from "./pricing-estimate-card";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { Label } from "@/components/ui/label";
import { MessageAttachments } from "@/components/chat/parts/message-attachments";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface ProjectDetailsProps {
  projectId: Id<"projects">;
  bookingDate?: number;
  bookingTime?: number;
  serviceName?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  buttonLabel?: string;
}

export function ProjectDetails({
  projectId,
  bookingDate,
  bookingTime,
  trigger,
  triggerClassName,
  buttonLabel = "View Details",
}: ProjectDetailsProps) {
  const project = useQuery(api.projects.query.getProject, {
    projectId,
  });

  const updateProject = useMutation(api.projects.mutate.updateProject);

  const handleUpdateStatus = async (
    newStatus: "pending" | "approved" | "rejected" | "completed",
  ) => {
    try {
      await updateProject({ projectId, status: newStatus });
      toast.success(`Project ${newStatus} successfully!`);
    } catch {
      toast.error(`Failed to update project to ${newStatus}`);
    }
  };

  const styles = project
    ? (STATUS_STYLES[project.status] ?? STATUS_STYLES.pending)
    : STATUS_STYLES.pending;

  const timelineSteps = project
    ? [
        {
          title: "Request submitted",
          statusLabel: "Completed",
          byLabel: project.client?.name ?? "Client",
          completed: true,
        },
        {
          title: "Admin review",
          statusLabel:
            project.status === "rejected"
              ? "Rejected"
              : project.status === "pending"
                ? "Pending"
                : "Completed",
          byLabel: project.status === "pending" ? "Waiting" : "Admin",
          active: project.status === "pending",
          completed:
            project.status === "approved" || project.status === "completed",
          rejected: project.status === "rejected",
        },
        {
          title: "Maker assignment",
          statusLabel:
            project.status === "rejected"
              ? "Cancelled"
              : project.status === "approved"
                ? "Completed"
                : project.status === "completed"
                  ? "Completed"
                  : "Pending",
          byLabel: project.status === "approved" ? "Assigned" : "Waiting",
          active: project.status === "approved",
          completed: project.status === "completed",
        },
        {
          title: "Project execution",
          statusLabel:
            project.status === "rejected"
              ? "Cancelled"
              : project.status === "completed"
                ? "Completed"
                : "Pending",
          byLabel: project.status === "completed" ? "Finished" : "Waiting",
          active: project.status === "completed",
          completed: project.status === "completed",
        },
      ]
    : [];

  return (
    <Dialog>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" className={cn("w-full", triggerClassName)}>
            {buttonLabel}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[92vh] sm:max-w-6xl overflow-x-hidden overflow-y-auto rounded-xl p-4 sm:p-6">
        {!project ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading project details...
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex flex-col gap-2 text-xl sm:flex-row sm:items-center sm:justify-between">
                {project.name}
              </DialogTitle>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
                      onClick={() => handleUpdateStatus("pending")}
                      disabled={project.status === "pending"}
                    >
                      <Circle className="mr-2 h-4 w-4" /> Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus("approved")}
                      disabled={project.status === "approved"}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />{" "}
                      Approve & Assign
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus("completed")}
                      disabled={project.status === "completed"}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />{" "}
                      Complete Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus("rejected")}
                      disabled={project.status === "rejected"}
                      className="text-red-600 focus:text-red-600"
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Reject Request
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              {/* left content */}
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
                          <p className="text-sm uppercase">
                            {project.serviceType}
                          </p>
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field className="gap-1">
                          <Label className="text-muted-foreground text-xs font-normal">
                            Material
                          </Label>
                          <p className="text-sm uppercase">
                            {project.material}
                          </p>
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
                          {project.resourceUsages &&
                          project.resourceUsages.length > 0
                            ? `${(
                                project.resourceUsages.reduce(
                                  (acc, u) => acc + (u.endTime - u.startTime),
                                  0,
                                ) /
                                (1000 * 60 * 60)
                              ).toFixed(1)} hours`
                            : "Not specified"}
                        </p>
                      </Field>
                    </FieldGroup>
                    <FieldGroup>
                      <Field className="bg-">
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
                    {project.resolvedFiles &&
                    project.resolvedFiles.length > 0 ? (
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

              {/* right content */}
              <div className="lg:col-span-5 space-y-6 min-w-0">
                <Card>
                  <CardContent className="space-y-3 sm:min-w-0">
                    <h3 className="text-base font-semibold sm:text-lg">
                      Resource Usage
                    </h3>
                    {project.resourceUsages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No usage records yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {project.resourceUsages.map((usage) => (
                          <div
                            key={usage._id}
                            className="rounded-md bg-muted/80 p-3 min-w-0"
                          >
                            <p className="wrap-break-word text-sm font-medium">
                              {usage.resourceDetails?.name ??
                                "Unassigned resource"}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground wrap-break-word">
                              Maker: {usage.makerName ?? "Unassigned"}
                            </p>
                            {usage.materialsUsed &&
                              usage.materialsUsed.length > 0 && (
                                <p className="mt-0.5 text-xs text-muted-foreground wrap-break-word">
                                  Material: {usage.materialsUsed[0].amountUsed}{" "}
                                  units
                                </p>
                              )}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
