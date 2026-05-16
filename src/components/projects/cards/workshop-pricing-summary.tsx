"use client";

import { formatLabDate, formatLabTime } from "@/lib/lab-time";
import type { ProjectData } from "../project-details-content";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

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
      ? serviceCategory.variants.find((v) => v.name === project.pricing)?.amount
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
    <Card size="sm">
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Workshop info */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Workshop
          </p>
          <p className="text-sm font-medium">{service.name}</p>
          <p className="text-xs text-muted-foreground">
            {dateStr} · {timeStr}
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Variant + Amount */}
        <div className="grid min-w-0 grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Variant
            </p>
            <p className="text-sm capitalize">{project.pricing}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Amount
            </p>
            <p className="text-lg font-bold text-emerald-600">
              ₱{amount.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
