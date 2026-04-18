"use client";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "./project-card";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectDetailsProps {
  projectId: Id<"projects">;
  serviceName?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  buttonLabel?: string;
}

export function ProjectDetails({
  projectId,
  trigger,
  triggerClassName,
  buttonLabel = "View Details",
}: ProjectDetailsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<"details" | "assign-maker">(
    "details",
  );
  const [selectedMaker, setSelectedMaker] = useState("");

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState<
    "cash" | "gcash" | "bank transfer" | "others"
  >("cash");
  const [proof, setProof] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const project = useQuery(api.projects.query.getProject, {
    projectId,
  });

  const updateProject = useMutation(api.projects.mutate.updateProject);
  const cancelOwnProject = useMutation(api.projects.mutate.cancelOwnProject);
  const markProjectPaid = useMutation(api.projects.mutate.markProjectPaid);
  const updateOwnProjectDetails = useMutation(
    api.projects.mutate.updateOwnProjectDetails,
  );
  const role = useQuery(api.users.getRole, {});
  const isClient = role === "client";

  const handleUpdateStatus = async (
    newStatus:
      | "pending"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled"
      | string,
  ) => {
    try {
      await updateProject({
        projectId,
        status: newStatus as
          | "pending"
          | "approved"
          | "rejected"
          | "completed"
          | "cancelled",
      });
      toast.success(`Project status updated to ${newStatus}!`);
    } catch {
      toast.error(`Failed to update project status`);
    }
  };

  const handleCancelProject = async () => {
    try {
      await cancelOwnProject({ projectId });
      toast.success("Project request cancelled.");
    } catch {
      toast.error("Failed to cancel project request.");
    }
  };

  const handleUpdateDetails = async (args: {
    description?: string;
    notes?: string;
    material?: "provide-own" | "buy-from-lab";
    serviceType?: "self-service" | "full-service" | "workshop";
    files?: string[];
  }) => {
    try {
      await updateOwnProjectDetails({
        projectId,
        ...args,
        files: args.files as Parameters<
          typeof updateOwnProjectDetails
        >[0]["files"],
      });
      toast.success("Project details updated.");
    } catch {
      toast.error("Failed to update project details.");
      throw new Error("Update failed");
    }
  };

  const handleMarkPaid = async () => {
    const num = parseInt(receiptNumber, 10);
    if (!receiptNumber || isNaN(num) || num <= 0) {
      toast.error("Please enter a valid receipt number.");
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
        receiptNumber: BigInt(num),
        paymentMode,
        proof: proof.trim(),
      });
      toast.success("Project marked as paid!");
      setPaymentDialogOpen(false);
      setReceiptNumber("");
      setProof("");
      setPaymentMode("cash");
    } catch {
      toast.error("Failed to mark project as paid.");
    } finally {
      setIsPaying(false);
    }
  };

  let styles = project
    ? (STATUS_STYLES[project.status] ?? STATUS_STYLES.pending)
    : STATUS_STYLES.pending;

  if (project?.status === "cancelled") {
    styles = {
      badge: "bg-red-100 text-red-700 border-red-200",
      cover: "from-red-500/20 to-red-500/5",
    };
  }

  const makers = useQuery(api.users.getMakers);

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
              : project.status === "cancelled"
                ? "Cancelled"
                : project.status === "pending"
                  ? "Pending"
                  : "Completed",
          byLabel: project.status === "pending" ? "Waiting" : "Admin",
          active: project.status === "pending",
          completed:
            project.status === "approved" ||
            project.status === "completed" ||
            project.status === "paid",
          rejected:
            project.status === "rejected" || project.status === "cancelled",
        },
        {
          title: "Fabrication",
          statusLabel:
            project.status === "rejected" || project.status === "cancelled"
              ? "Cancelled"
              : project.status === "completed" || project.status === "paid"
                ? "Completed"
                : "Pending",
          byLabel: project.assignedMaker
            ? project.assignedMaker.name
            : "Waiting",
          active: project.status === "approved",
          completed:
            project.status === "completed" || project.status === "paid",
          rejected:
            project.status === "rejected" || project.status === "cancelled",
        },
        {
          title: "Payment",
          statusLabel:
            project.status === "rejected" || project.status === "cancelled"
              ? "Cancelled"
              : project.status === "paid"
                ? "Paid"
                : "Awaiting payment",
          byLabel:
            project.status === "paid"
              ? "Admin"
              : project.status === "completed"
                ? "Waiting"
                : "—",
          active: project.status === "completed",
          completed: project.status === "paid",
          rejected:
            project.status === "rejected" || project.status === "cancelled",
        },
      ]
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
    setIsDialogOpen(open);
    if (!open) {
      setDialogView("details");
      setSelectedMaker("");
      setPaymentDialogOpen(false);
    }
  };

  const handleOpenPaymentDialog = () => {
    // Pre-populate from existing receipt when updating
    if (project?.receipt) {
      setReceiptNumber(project.receipt.receiptNumber?.toString() ?? "");
      setPaymentMode(
        (project.receipt.paymentMode as typeof paymentMode) ?? "cash",
      );
      setProof(project.receipt.proof ?? "");
    } else {
      setReceiptNumber("");
      setPaymentMode("cash");
      setProof("");
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
      toast.success("Project approved and maker assigned!");
      setDialogView("details");
    } catch {
      toast.error("Failed to assign maker.");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" className={cn("w-full", triggerClassName)}>
            {buttonLabel}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="top-0 left-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 translate-x-0 translate-y-0 max-h-screen h-screen sm:h-auto sm:max-h-[92vh] sm:max-w-6xl max-w-full overflow-x-hidden overflow-y-auto rounded-none sm:rounded-xl p-4 sm:p-6">
        {!project ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading project details...
          </div>
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
              styles={styles}
              timelineSteps={timelineSteps}
              onOpenAssignView={handleOpenAssignView}
              onUpdateStatus={handleUpdateStatus}
              onMarkPaid={() => handleOpenPaymentDialog()}
              isClient={isClient}
              onCancelProject={handleCancelProject}
              onUpdateDetails={isClient ? handleUpdateDetails : undefined}
            />

            {/* ── Mark as Paid dialog ─────────────────────────────────── */}
            <Dialog
              open={paymentDialogOpen}
              onOpenChange={setPaymentDialogOpen}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {project?.receipt
                      ? "Update Payment Details"
                      : "Mark Project as Paid"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="receipt-number">Receipt Number</Label>
                    <Input
                      id="receipt-number"
                      type="number"
                      min={1}
                      placeholder="e.g. 10042"
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gcash">GCash</SelectItem>
                        <SelectItem value="bank transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="others">Others</SelectItem>
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
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(false)}
                    disabled={isPaying}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleMarkPaid}
                    disabled={isPaying}
                    style={{ background: "var(--fab-teal)", color: "#fff" }}
                  >
                    {isPaying
                      ? "Saving…"
                      : project?.receipt
                        ? "Update Payment"
                        : "Confirm Payment"}
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
