"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select as PaymentModeSelect,
  SelectContent as PaymentModeSelectContent,
  SelectGroup as PaymentModeSelectGroup,
  SelectItem as PaymentModeSelectItem,
  SelectLabel as PaymentModeSelectLabel,
  SelectTrigger as PaymentModeSelectTrigger,
  SelectValue as PaymentModeSelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/file-upload";
import type { UploadedFile } from "@/components/file-upload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_LABELS,
  type ProjectStatusType,
  type PaymentModeType,
  FILE_CATEGORIES,
} from "@convex/constants";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  StatusBadge,
  type StatusColorSet,
} from "@/components/brand/primitives";

export type AttendeeInfo = {
  projectId: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  pfpUrl: string | null;
  createdAt: number;
  roomId: string | null;
  threadId: string | null;
};

const STATUS_COLORS: Record<string, StatusColorSet> = {
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  paid: {
    bg: "bg-fab-teal/20",
    text: "text-fab-teal",
    dot: "bg-fab-teal",
  },
  completed: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  approved: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  claimed: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
};

/** Valid workshop workflow transitions keyed by current status. */
const WORKSHOP_TRANSITIONS: Record<string, ProjectStatusType[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["paid", "completed", "cancelled"],
  paid: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
  claimed: [],
};

export function WorkshopAttendeeRow({
  attendee,
  readOnly = false,
  onOpenProjectDetails,
}: {
  attendee: AttendeeInfo;
  readOnly?: boolean;
  onOpenProjectDetails?: (projectId: string) => void;
}) {
  const colors = STATUS_COLORS[attendee.status] ?? STATUS_COLORS.pending;
  const updateProject = useMutation(api.projects.mutate.updateProject);
  const markProjectPaid = useMutation(api.projects.mutate.markProjectPaid);
  const transitions = WORKSHOP_TRANSITIONS[attendee.status] ?? [];

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState<PaymentModeType>("cash");
  const [proof, setProof] = React.useState("");
  const [proofFiles, setProofFiles] = React.useState<UploadedFile[]>([]);
  const [isPaying, setIsPaying] = React.useState(false);
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);

  const handleStatusChange = async (newStatus: ProjectStatusType) => {
    if (newStatus === "paid") {
      // Open the payment dialog instead of transitioning directly
      setPaymentDialogOpen(true);
      return;
    }

    try {
      await updateProject({
        projectId: attendee.projectId as Id<"projects">,
        status: newStatus,
      });
      toast.success(
        `${attendee.name} → ${PROJECT_STATUS_LABELS[newStatus] ?? newStatus}`,
      );
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to update status.";
      toast.error(message);
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
        projectId: attendee.projectId as Id<"projects">,
        receiptString: receiptNumber.trim(),
        paymentMode,
        proof: proof.trim(),
        proofFiles: proofFiles.map((f) => f.storageId as Id<"_storage">),
      });
      toast.success(`${attendee.name} → Payment recorded. Workshop confirmed.`);
      setPaymentDialogOpen(false);
      setReceiptNumber("");
      setProof("");
      setPaymentMode("cash");
      setProofFiles([]);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : error instanceof Error
            ? error.message
            : "Failed to record payment.";
      toast.error(message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleValueChange = (value: string) => {
    handleStatusChange(value as ProjectStatusType);
  };

  const initials = attendee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentLabel =
    PROJECT_STATUS_LABELS[
      attendee.status as keyof typeof PROJECT_STATUS_LABELS
    ] ?? attendee.status;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-amber-50/50">
      <Avatar size="sm">
        {attendee.pfpUrl ? (
          <AvatarImage src={attendee.pfpUrl} alt={attendee.name} />
        ) : (
          <AvatarFallback className="bg-amber-100 text-amber-700 text-[10px] font-bold">
            {initials}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {attendee.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {attendee.email}
        </span>
      </div>

      {/* Status — select if there are transitions available */}
      {transitions.length > 0 && !readOnly ? (
        <Select value={attendee.status} onValueChange={handleValueChange}>
          <SelectTrigger
            className={cn(
              "h-9 w-auto min-w-28 border-2 border-black bg-white text-xs font-black uppercase tracking-tighter shadow-[2px_2px_0_0_#000]",
              colors.text,
            )}
          >
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 shrink-0", colors.dot)} />
                {currentLabel}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="end"
            className="min-w-36 border-2 border-black shadow-[3px_3px_0_0_#000]"
          >
            {transitions.map((transition) => {
              const tColors =
                STATUS_COLORS[transition] ?? STATUS_COLORS.pending;
              return (
                <SelectItem
                  key={transition}
                  value={transition}
                  className="gap-2 text-xs font-black uppercase tracking-tighter"
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0", tColors.dot)} />
                    {PROJECT_STATUS_LABELS[transition] ?? transition}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <StatusBadge label={currentLabel} colors={colors} />
      )}

      <div className="flex shrink-0 items-center gap-1">
        {/* Chat — opens the conversation thread */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
          <Link
            href={`/dashboard/chat/${attendee.roomId}/${attendee.threadId}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
        </Button>

        {/* More — opens the workshop attendee details dialog */}
        {onOpenProjectDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onOpenProjectDetails(attendee.projectId)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            More
          </Button>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment and Confirm Workshop</DialogTitle>
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
              <PaymentModeSelect
                value={paymentMode}
                onValueChange={(v) =>
                  setPaymentMode(
                    v as "cash" | "gcash" | "bank transfer" | "others",
                  )
                }
              >
                <PaymentModeSelectTrigger id="payment-mode" className="w-full">
                  <PaymentModeSelectValue placeholder="Select payment mode" />
                </PaymentModeSelectTrigger>
                <PaymentModeSelectContent>
                  <PaymentModeSelectGroup>
                    <PaymentModeSelectLabel>
                      Payment Methods
                    </PaymentModeSelectLabel>
                    <PaymentModeSelectItem value="cash">
                      Cash
                    </PaymentModeSelectItem>
                    <PaymentModeSelectItem value="gcash">
                      GCash
                    </PaymentModeSelectItem>
                    <PaymentModeSelectItem value="bank transfer">
                      Bank Transfer
                    </PaymentModeSelectItem>
                    <PaymentModeSelectItem value="others">
                      Others
                    </PaymentModeSelectItem>
                  </PaymentModeSelectGroup>
                </PaymentModeSelectContent>
              </PaymentModeSelect>
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
                allowedTypes={[...FILE_CATEGORIES.Images, "application/pdf"]}
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
              }}
              disabled={isPaying}
            >
              Cancel
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
                  : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
