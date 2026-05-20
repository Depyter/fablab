"use client";

import { DetailCard, DetailChip } from "./detail-card";
import { ProjectAttachments } from "@/components/projects/project-attachments";
import { getWorkflow } from "@/lib/project-type-meta";
import { ProjectStatusType } from "@convex/constants";

interface ReceiptFile {
  storageId: string;
  url: string | null;
  type?: string | null;
  originalName?: string | null;
}

interface Receipt {
  receiptString: string;
  paymentMode: string;
  proof?: string | null;
  resolvedFiles?: ReceiptFile[] | null;
}

interface ReceiptCardProps {
  receipt?: Receipt | null;
  status: ProjectStatusType;
  projectType: string;
  onMarkPaid: () => void;
}

export function ReceiptCard({
  receipt,
  status,
  projectType,
  onMarkPaid,
}: ReceiptCardProps) {
  const workflow = getWorkflow(projectType);
  const visible = receipt || workflow.payableStatuses.includes(status);

  if (!visible) return null;

  const attachments = (receipt?.resolvedFiles ?? []).filter(
    (f): f is ReceiptFile & { url: string } => !!f.url,
  );

  return (
    <DetailCard
      title="Payment Receipt"
      titleColor="text-fab-teal"
      headerBg="bg-fab-teal/10"
      headerRight={
        receipt ? (
          <DetailChip
            label="Recorded"
            bg="bg-fab-teal/20"
            color="var(--fab-teal)"
          />
        ) : undefined
      }
      onEdit={onMarkPaid}
      bodyClassName={receipt ? "grid grid-cols-2 gap-x-6 gap-y-3" : undefined}
    >
      {receipt ? (
        <>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Receipt
            </p>
            <p className="text-sm font-bold text-black break-all">
              {receipt.receiptString}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Payment Mode
            </p>
            <p className="text-sm font-bold text-black capitalize">
              {receipt.paymentMode}
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Proof
            </p>
            <p className="text-sm font-bold text-black/60 break-all">
              {receipt.proof || "No proof details"}
            </p>
          </div>
          {attachments.length > 0 && (
            <div className="col-span-2 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Attachments
              </p>
              <ProjectAttachments files={attachments} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm font-bold text-black/60">
          No receipt recorded yet.
        </p>
      )}
    </DetailCard>
  );
}
