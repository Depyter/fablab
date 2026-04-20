"use client";

import { DetailCard, DetailChip } from "./detail-card";

interface Receipt {
  receiptNumber: number | string | bigint;
  paymentMode: string;
  proof?: string | null;
}

interface ReceiptCardProps {
  receipt?: Receipt | null;
  status: string;
  onMarkPaid: () => void;
}

export function ReceiptCard({ receipt, status, onMarkPaid }: ReceiptCardProps) {
  const visible = receipt || status === "completed" || status === "paid";

  if (!visible) return null;

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
              Receipt Number
            </p>
            <p
              className="wrap-break-word text-sm font-medium"
              style={{ color: "var(--fab-text-primary)" }}
            >
              {receipt.receiptNumber.toString()}
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
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--fab-text-dim)" }}>
          No receipt recorded yet.
        </p>
      )}
    </DetailCard>
  );
}
