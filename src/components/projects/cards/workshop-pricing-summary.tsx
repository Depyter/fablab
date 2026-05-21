"use client";

import { formatLabDate, formatLabTime } from "@/lib/lab-time";
import type { ProjectData } from "../project-details-content";
import { DetailCard } from "./detail-card";

interface WorkshopPricingSummaryProps {
  project: ProjectData;
  receipt?: ProjectData["receipt"];
  onMarkPaid?: () => void;
}

export function WorkshopPricingSummary({
  project,
  receipt,
  onMarkPaid,
}: WorkshopPricingSummaryProps) {
  const service = project.service;
  if (!service) return null;

  const serviceCategory = service.serviceCategory;
  if (serviceCategory.type !== "WORKSHOP") return null;

  const variantAmount =
    project.pricing && serviceCategory.variants
      ? serviceCategory.variants.find((v) => v.name === project.pricing)?.amount
      : undefined;
  const amount = variantAmount ?? serviceCategory.amount;

  const dateStr =
    project.bookingStartTime != null
      ? formatLabDate(project.bookingStartTime, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";
  const timeStr =
    project.bookingStartTime != null
      ? `${formatLabTime(project.bookingStartTime)} – ${formatLabTime(project.bookingEndTime ?? project.bookingStartTime)}`
      : "—";

  const receiptFiles = (receipt?.resolvedFiles ?? []).filter(
    (f) => !!f.url,
  ) as unknown as Array<{
    storageId: string;
    url: string;
    type?: string | null;
    originalName?: string | null;
  }>;

  return (
    <DetailCard title="Pricing" bodyClassName="space-y-3" onEdit={onMarkPaid}>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
          Workshop
        </p>
        <p className="text-sm font-bold text-black">{service.name}</p>
        <p className="text-xs font-bold text-black/60">
          {dateStr} · {timeStr}
        </p>
      </div>

      <div className="h-px bg-black" />

      <div className="grid min-w-0 grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            Variant
          </p>
          <p className="text-sm font-bold text-black capitalize">
            {project.pricing}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            Amount
          </p>
          <p className="text-lg font-black text-fab-teal">
            ₱{amount.toFixed(2)}
          </p>
        </div>
      </div>

      {receipt ? (
        <>
          <div className="h-px bg-black" />
          <div className="grid min-w-0 grid-cols-2 gap-4">
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
                Payment
              </p>
              <p className="text-sm font-bold text-black capitalize">
                {receipt.paymentMode}
              </p>
            </div>
          </div>
          {receipt.proof && (
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Proof
              </p>
              <p className="text-sm font-bold text-black/60 break-all">
                {receipt.proof}
              </p>
            </div>
          )}
          {receiptFiles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
                Attachments
              </p>
              <div className="flex flex-wrap gap-2">
                {receiptFiles.map((f) => (
                  <a
                    key={f.storageId}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
                  >
                    {f.originalName || "View File"}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : onMarkPaid ? (
        <>
          <div className="h-px bg-black" />
          <button
            type="button"
            onClick={onMarkPaid}
            className="inline-flex h-9 w-full items-center justify-center border-2 border-black bg-fab-teal px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
          >
            Mark as Paid
          </button>
        </>
      ) : null}
    </DetailCard>
  );
}
