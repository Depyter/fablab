"use client";

import { DetailCard, DetailChip } from "./detail-card";
import { ProjectAttachments } from "@/components/projects/project-attachments";

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
  status: string;
  onMarkPaid: () => void;
}

export function ReceiptCard({ receipt, status, onMarkPaid }: ReceiptCardProps) {
  const visible = receipt || status === "completed" || status === "paid";

  if (!visible) return null;

  const attachments = (receipt?.resolvedFiles ?? []).filter(
    (f): f is ReceiptFile & { url: string } => !!f.url,
  );

  return (
    <DetailCard
      title="Payment Receipt"
      titleColor="var(--fab-teal)"
      headerBg="color-mix(in srgb, var(--fab-teal) 7%, var(--fab-bg-sidebar))"
      headerRight={
        receipt ? (
          <DetailChip
            label="Recorded"
            bg="color-mix(in srgb, var(--fab-teal) 14%, white)"
            color="var(--fab-teal)"
          />
        ) : undefined
      }
      onEdit={onMarkPaid}
      penColor="var(--fab-teal)"
      bodyClassName={receipt ? "grid grid-cols-2 gap-x-6 gap-y-3" : undefined}
    >
      {receipt ? (
        <>
          <div className="space-y-0.5">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              Receipt
            </p>
            <p
              className="wrap-break-word text-sm font-medium"
              style={{ color: "var(--fab-text-primary)" }}
            >
              {receipt.receiptString}
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
              {receipt.paymentMode}
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
              {receipt.proof || "No proof details"}
            </p>
          </div>
          {attachments.length > 0 && (
            <div className="col-span-2 space-y-1.5">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fab-text-dim)" }}
              >
                Attachments
              </p>
              <ProjectAttachments files={attachments} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--fab-text-dim)" }}>
          No receipt recorded yet.
        </p>
      )}
    </DetailCard>
  );
}
