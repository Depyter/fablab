"use client";

import { DetailCard } from "./detail-card";
import { formatLabDate, formatLabTime } from "@/lib/lab-time";
import type { ProjectData } from "../project-details-content";

interface WorkshopPricingSummaryProps {
  project: ProjectData;
}

/**
 * A compact pricing card for workshop registrations.
 * Replaces the full PricingEstimateCard for workshop projects.
 * Shows the flat workshop fee, pricing variant, and payment status.
 */
export function WorkshopPricingSummary({
  project,
}: WorkshopPricingSummaryProps) {
  const service = project.service;
  if (!service) return null;

  const serviceCategory = service.serviceCategory;
  if (serviceCategory.type !== "WORKSHOP") return null;

  // Resolve the chosen variant's amount, or fall back to the default amount
  const variantAmount =
    project.pricing && serviceCategory.variants
      ? serviceCategory.variants.find(
          (v) => v.name === project.pricing,
        )?.amount
      : undefined;
  const amount = variantAmount ?? serviceCategory.amount;

  // Format the booking date/time for display
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

  return (
    <DetailCard
      title="Pricing"
      titleColor="var(--fab-teal)"
      bodyClassName="space-y-3"
    >
      {/* Workshop info */}
      <div className="space-y-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--fab-text-dim)" }}
        >
          Workshop
        </p>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--fab-text-primary)" }}
        >
          {service.name}
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--fab-text-muted)" }}
        >
          {dateStr} · {timeStr}
        </p>
      </div>

      <div className="h-px" style={{ background: "var(--fab-border-soft)" }} />

      {/* Variant + Amount */}
      <div className="grid min-w-0 grid-cols-2 gap-4">
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            Variant
          </p>
          <p
            className="text-sm capitalize"
            style={{ color: "var(--fab-text-primary)" }}
          >
            {project.pricing}
          </p>
        </div>
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--fab-text-dim)" }}
          >
            Amount
          </p>
          <p
            className="text-lg font-bold"
            style={{ color: "var(--fab-teal)" }}
          >
            ₱{amount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Receipt info — shown when payment is recorded */}
      {project.receipt && (
        <>
          <div className="h-px" style={{ background: "var(--fab-border-soft)" }} />

          <div className="space-y-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--fab-text-dim)" }}
            >
              Payment
            </p>
            <div className="space-y-0.5 text-sm">
              <p style={{ color: "var(--fab-text-primary)" }}>
                {project.receipt.paymentMode} · {project.receipt.receiptString}
              </p>
              {project.receipt.proof && (
                <p
                  className="wrap-break-word text-xs"
                  style={{ color: "var(--fab-text-muted)" }}
                >
                  {project.receipt.proof}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </DetailCard>
  );
}
