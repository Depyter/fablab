"use client";
import React, { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/../convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { OptionRadioGroupItem } from "../option-radio-group";
import { AssignMakerContent } from "./assign-maker-content";
import { ProjectDetailsContent } from "./project-details-content";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FileUpload } from "@/components/file-upload";
import type { UploadedFile } from "@/components/file-upload";
import posthog from "posthog-js";

import {
  ProjectStatusType,
  PaymentModeType,
  UserRoleType,
  ProjectMaterialType,
  FulfillmentModeType,
  FILE_CATEGORIES,
} from "@convex/constants";
import { getConfig, getWorkflow, isKnownType } from "@/lib/project-type-meta";

interface ProjectDetailsProps {
  projectId?: Id<"projects"> | null;
  serviceName?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  buttonLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const PROJECT_DETAILS_TIMELINE_LOADING_STEPS = Array.from(
  { length: 5 },
  (_, i) => ({
    titleWidth: "w-20",
    isLast: i === 4,
  }),
);

function ProjectTimelineLoadingDot() {
  return (
    <div className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full border-2 border-[var(--fab-border-md)] bg-[var(--fab-bg-sidebar)] shadow-sm sm:h-10 sm:w-10">
      <div className="h-3.5 w-3.5 rounded-full bg-[var(--fab-text-dim)]/35 sm:h-4 sm:w-4" />
    </div>
  );
}

function ProjectTimelineLoading() {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="flex flex-col md:hidden">
        {PROJECT_DETAILS_TIMELINE_LOADING_STEPS.map((step, index) => {
          const isLast =
            index === PROJECT_DETAILS_TIMELINE_LOADING_STEPS.length - 1;

          return (
            <div
              key={`project-timeline-mobile-loading-${index}`}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <ProjectTimelineLoadingDot />
                {!isLast && (
                  <div className="w-px min-h-8 flex-1 rounded-full bg-[var(--fab-border-md)]" />
                )}
              </div>
              <div className={cn("min-w-0 flex-1", !isLast && "pb-6")}>
                <div className="flex h-9 items-center">
                  <Skeleton
                    className={cn("h-4 rounded-full", step.titleWidth)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div
          className="grid min-w-180 pb-2 lg:min-w-0"
          style={{
            gridTemplateColumns: `repeat(${PROJECT_DETAILS_TIMELINE_LOADING_STEPS.length}, minmax(0, 1fr))`,
          }}
        >
          {PROJECT_DETAILS_TIMELINE_LOADING_STEPS.map((step, index) => {
            const isLast =
              index === PROJECT_DETAILS_TIMELINE_LOADING_STEPS.length - 1;

            return (
              <div
                key={`project-timeline-desktop-loading-${index}`}
                className="flex min-w-0 flex-col items-center"
              >
                <div className="relative flex h-10 w-full items-center justify-center">
                  {index > 0 && (
                    <div className="absolute left-0 right-1/2 flex items-center pr-[18px]">
                      <div className="h-0.5 flex-1 rounded-full bg-[var(--fab-border-md)]" />
                    </div>
                  )}
                  <ProjectTimelineLoadingDot />
                  {!isLast && (
                    <div className="absolute left-1/2 right-0 flex items-center pl-[18px]">
                      <div className="h-0.5 flex-1 rounded-full bg-[var(--fab-border-md)]" />
                    </div>
                  )}
                </div>

                <div className="mt-2 px-2.5 text-center">
                  <Skeleton
                    className={cn("mx-auto h-4 rounded-full", step.titleWidth)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsLoadingSkeleton() {
  return (
    <div className="min-w-0 space-y-0">
      <div className="space-y-5 pt-5">
        <DialogHeader className="space-y-0 mb-0">
          <DialogTitle className="sr-only">Loading project details</DialogTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-8 w-56 max-w-full rounded-md" />
              <div className="flex flex-wrap items-center gap-1.5">
                <Skeleton className="h-6 w-24 rounded-[5px]" />
                <Skeleton className="h-6 w-28 rounded-[5px]" />
                <Skeleton className="h-6 w-24 rounded-[5px]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Skeleton className="h-8 w-32 rounded-md" />
              <Skeleton className="h-8 w-36 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
          </div>
        </DialogHeader>

        <Skeleton className="h-px w-full rounded-none" />

        <ProjectTimelineLoading />

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-7">
            <div className="space-y-4 rounded-xl border p-5">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-[92%] rounded-full" />
                <Skeleton className="h-4 w-[76%] rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-[70%] rounded-full" />
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4 lg:col-span-5">
            <div className="rounded-xl border p-5">
              <Skeleton className="h-5 w-44 rounded-md" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetails({
  projectId,
  trigger,
  triggerClassName,
  buttonLabel = "View Details",
  open,
  onOpenChange,
  hideTrigger = false,
}: ProjectDetailsProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [dialogView, setDialogView] = useState<"details" | "assign-maker">(
    "details",
  );
  const [selectedMaker, setSelectedMaker] = useState("");

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentModeType>("cash");
  const [proof, setProof] = useState("");
  const [proofFiles, setProofFiles] = useState<UploadedFile[]>([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const isDialogOpen = open ?? uncontrolledOpen;
  const shouldLoadDialogData = Boolean(projectId) && isDialogOpen;

  const project = useQuery(
    api.projects.query.getProject,
    shouldLoadDialogData && projectId ? { projectId } : "skip",
  );

  const updateProject = useMutation(api.projects.mutate.updateProject);
  const markProjectPaid = useMutation(api.projects.mutate.markProjectPaid);
  const updateOwnProjectDetails = useMutation(
    api.projects.mutate.updateOwnProjectDetails,
  );
  const validateTextContent = useAction(api.moderation.validateTextContent);
  const role = useQuery(
    api.users.getRole,
    shouldLoadDialogData ? {} : "skip",
  ) as UserRoleType | undefined;
  const isClient = role === "client";
  const isAdminOrMaker = role === "admin" || role === "maker";
  const makers = useQuery(
    api.users.getMakers,
    shouldLoadDialogData && isAdminOrMaker ? {} : "skip",
  );

  if (!projectId) {
    if (hideTrigger) {
      return null;
    }
    if (React.isValidElement<{ className?: string }>(trigger)) {
      return React.cloneElement(trigger, {
        className: cn(trigger.props.className, "cursor-default hover:ring-0"),
      });
    }
    return <>{trigger}</>;
  }

  const handleUpdateStatus = async (newStatus: ProjectStatusType) => {
    // If transitioning from pending → approved and the project type requires
    // a maker (FABRICATION) but none is assigned, show the assign-maker dialog
    // instead of running the mutation (which would error out).
    if (
      newStatus === "approved" &&
      project?.status === "pending" &&
      !project?.assignedMaker &&
      project &&
      isKnownType(project.type) &&
      getWorkflow(project.type).approvalRequiresMaker
    ) {
      setDialogView("assign-maker");
      return;
    }

    try {
      await updateProject({
        projectId,
        status: newStatus,
      });
      posthog.capture("project_status_updated", {
        project_id: projectId,
        project_name: project?.name,
        new_status: newStatus,
      });
      toast.success(`Project status updated to ${newStatus}!`);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to update project status";
      toast.error(message);
    }
  };

  const handleUpdateDetails = async (args: {
    description?: string;
    notes?: string;
    material?: ProjectMaterialType;
    fulfillmentMode?: FulfillmentModeType;
    files?: string[];
  }) => {
    try {
      // ── Pre-flight moderation check for updated text fields ───────────
      if (args.description !== undefined || args.notes !== undefined) {
        const moderation = await validateTextContent({
          texts: [
            args.description ?? project?.description ?? "",
            args.notes ?? project?.notes ?? "",
          ].filter((t) => t.trim().length > 0),
        });

        if (moderation.flagged) {
          toast.error(
            "Your changes couldn't be saved because the text may violate content policies.",
          );
          return false;
        }
      }

      await updateOwnProjectDetails({
        projectId,
        ...args,
        files: args.files as Id<"_storage">[],
      });
      posthog.capture("project_details_updated", {
        project_id: projectId,
        project_name: project?.name,
      });
      toast.success("Project details updated.");
      return true;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to update project details.";
      toast.error(message);
      return false;
    }
  };

  const handleMarkPaid = async () => {
    if (!receiptNumber.trim()) {
      toast.error("Please enter a receipt number.");
      return;
    }
    if (!proof.trim()) {
      toast.error("Please describe the proof of payment.");
      return;
    }
    setIsPaying(true);
    try {
      await markProjectPaid({
        projectId,
        receiptString: receiptNumber.trim(),
        paymentMode,
        proof: proof.trim(),
        proofFiles: proofFiles.map((f) => f.storageId as Id<"_storage">),
      });
      posthog.capture("project_payment_recorded", {
        project_id: projectId,
        project_name: project?.name,
        payment_mode: paymentMode,
      });
      const nextLabel =
        project?.type === "WORKSHOP" ? "workshop confirmed" : "claim";
      toast.success(`Payment recorded. Project moved to ${nextLabel}.`);
      setPaymentDialogOpen(false);
      setReceiptNumber("");
      setProof("");
      setPaymentMode("cash");
      setProofFiles([]);
      setIsPaying(false);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to record payment.";
      toast.error(message);
      setIsPaying(false);
    }
  };

  const timelineSteps =
    project && isKnownType(project.type)
      ? (() => {
          const config = getConfig(project.type);
          const { timeline } = config;
          const currentStepIndex = timeline.findIndex(
            (step) => step.status === project.status,
          );
          const isRejected =
            project.status === "rejected" || project.status === "cancelled";
          const isPastEndState = currentStepIndex < 0 && !isRejected;
          const effectiveIndex = isPastEndState
            ? timeline.length
            : currentStepIndex >= 0
              ? Math.min(currentStepIndex + 1, timeline.length)
              : timeline.length;

          return timeline.map((stepDef, index) => {
            const isPast = index < effectiveIndex || isPastEndState;
            const isCurrent = index === effectiveIndex && !isPastEndState;

            return {
              title: stepDef.title,
              statusLabel: isRejected
                ? "Cancelled"
                : isCurrent
                  ? "In progress"
                  : isPast
                    ? "Completed"
                    : "Pending",
              byLabel: stepDef.getByLabel(project),
              active: isCurrent && !isRejected,
              completed: isPast && !isRejected,
              rejected: isRejected,
            };
          });
        })()
      : [];

  const makerOptions: OptionRadioGroupItem[] = makers
    ? makers.map((m) => ({
        value: m._id,
        id: m._id,
        title: m.name,
        status: "available",
        activeProjectsAssigned: 0,
      }))
    : [];

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setUncontrolledOpen(open);
    }
    if (open) {
      posthog.capture("project_details_opened", {
        project_id: projectId,
        project_name: project?.name,
        project_status: project?.status,
      });
    } else {
      setDialogView("details");
      setSelectedMaker("");
      setPaymentDialogOpen(false);
    }
  };

  const handleOpenPaymentDialog = () => {
    if (project?.receipt) {
      setReceiptNumber(project.receipt.receiptString ?? "");
      setPaymentMode(
        (project.receipt.paymentMode as typeof paymentMode) ?? "cash",
      );
      setProof(project.receipt.proof ?? "");
      setProofFiles([]);
    } else {
      setReceiptNumber("");
      setPaymentMode("cash");
      setProof("");
      setProofFiles([]);
    }
    setPaymentDialogOpen(true);
  };

  const handleOpenAssignView = () => {
    setDialogView("assign-maker");
  };

  const handleBackToDetails = () => {
    setDialogView("details");
  };

  const handleAssignMaker = async () => {
    if (!selectedMaker) {
      toast.error("Please choose a maker first.");
      return;
    }

    try {
      await updateProject({
        projectId,
        status: "approved",
        makerId: selectedMaker as Id<"userProfile">,
      });
      posthog.capture("project_maker_assigned", {
        project_id: projectId,
        project_name: project?.name,
        maker_id: selectedMaker,
      });
      toast.success("Project moved to fabrication and maker assigned.");
      setDialogView("details");
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to assign maker.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        trigger ? (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full", triggerClassName)}
            >
              {buttonLabel}
            </Button>
          </DialogTrigger>
        )
      ) : null}

      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 translate-x-0 translate-y-0 max-h-screen h-screen sm:h-auto sm:max-h-[92vh] sm:max-w-4xl max-w-full overflow-x-hidden overflow-y-auto rounded-none p-3 sm:p-4"
      >
        {!project || role === undefined ? (
          <ProjectDetailsLoadingSkeleton />
        ) : dialogView === "assign-maker" ? (
          <AssignMakerContent
            projectName={project.name}
            selectedMaker={selectedMaker}
            makerOptions={makerOptions}
            onSelectMaker={setSelectedMaker}
            onBack={handleBackToDetails}
            onConfirm={handleAssignMaker}
          />
        ) : (
          <>
            <ProjectDetailsContent
              project={project}
              timelineSteps={timelineSteps}
              onOpenAssignView={handleOpenAssignView}
              onUpdateStatus={handleUpdateStatus}
              onMarkPaid={handleOpenPaymentDialog}
              isClient={isClient}
              onUpdateDetails={
                isClient || isAdminOrMaker ? handleUpdateDetails : undefined
              }
              headerRight={
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
                  >
                    <XIcon className="size-4" strokeWidth={4} />
                    <span className="sr-only">Close</span>
                  </button>
                </DialogClose>
              }
            />

            <Dialog
              open={paymentDialogOpen}
              onOpenChange={setPaymentDialogOpen}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {project?.receipt
                      ? "Update Payment Details"
                      : project?.type === "WORKSHOP"
                        ? "Record Payment and Confirm Workshop"
                        : "Record Payment and Move to Claim"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="receipt-number">Receipt Number</Label>
                    <Input
                      id="receipt-number"
                      type="text"
                      placeholder="e.g. OR-10042"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payment-mode">Payment Mode</Label>
                    <Select
                      value={paymentMode}
                      onValueChange={(v) =>
                        setPaymentMode(
                          v as "cash" | "gcash" | "bank transfer" | "others",
                        )
                      }
                    >
                      <SelectTrigger id="payment-mode" className="w-full">
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Payment Methods</SelectLabel>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="gcash">GCash</SelectItem>
                          <SelectItem value="bank transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="others">Others</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="proof">Proof of Payment</Label>
                    <Textarea
                      id="proof"
                      placeholder="Reference number, transaction ID, or other details…"
                      rows={3}
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attachments (optional)</Label>
                    <FileUpload
                      title="Upload proof (images or PDF)"
                      variant="compact"
                      multiple
                      accept="image/*,.pdf"
                      allowedTypes={[
                        ...FILE_CATEGORIES.Images,
                        "application/pdf",
                      ]}
                      value={proofFiles}
                      onFilesChange={setProofFiles}
                      onUploadingChange={setIsUploadingProof}
                      autoUpload
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaymentDialogOpen(false);
                      if (project?.receipt) {
                        handleUpdateStatus("paid");
                      }
                    }}
                    disabled={isPaying}
                  >
                    {project?.receipt ? "Skip" : "Cancel"}
                  </Button>
                  <Button
                    onClick={handleMarkPaid}
                    disabled={isPaying || isUploadingProof}
                    style={{ background: "var(--fab-teal)", color: "#fff" }}
                  >
                    {isUploadingProof
                      ? "Uploading…"
                      : isPaying
                        ? "Saving…"
                        : project?.receipt
                          ? "Update Payment"
                          : "Record Payment"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
