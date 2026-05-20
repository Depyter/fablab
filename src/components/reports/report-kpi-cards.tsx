"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
  label: string;
  value: string | number | null;
  isLoading?: boolean;
}

function KpiCard({ label, value, isLoading }: KpiCardProps) {
  return (
    <div className="flex items-baseline gap-2 rounded-lg border bg-background px-3 py-2 min-w-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-5 w-16 inline-block" />
      ) : (
        <span className="text-sm font-semibold tabular-nums">
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

interface ReportKpiCardsProps {
  metrics: {
    projectCount: number;
    workshopCount: number;
    totalRevenue: number;
    totalMaterialCost: number;
    resourceUtilization: Array<unknown>;
    materialUsage: Array<unknown>;
  } | null;
  isLoading: boolean;
}

export function ReportKpiCards({ metrics, isLoading }: ReportKpiCardsProps) {
  const totalBookedMinutes = React.useMemo(
    () =>
      metrics?.resourceUtilization?.reduce<number>(
        (sum, r) =>
          sum + (r as { totalBookedMinutes: number }).totalBookedMinutes,
        0,
      ) ?? 0,
    [metrics?.resourceUtilization],
  );

  const totalMaterialUsed = React.useMemo(
    () =>
      metrics?.materialUsage?.reduce<number>(
        (sum, m) => sum + (m as { totalUsed: number }).totalUsed,
        0,
      ) ?? 0,
    [metrics?.materialUsage],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="flex flex-wrap gap-2">
      <KpiCard
        label="Projects"
        value={metrics?.projectCount ?? null}
        isLoading={isLoading}
      />
      <KpiCard
        label="Workshops"
        value={metrics?.workshopCount ?? null}
        isLoading={isLoading}
      />
      <KpiCard
        label="Revenue"
        value={
          metrics?.totalRevenue != null
            ? formatCurrency(metrics.totalRevenue)
            : null
        }
        isLoading={isLoading}
      />
      <KpiCard
        label="Hours"
        value={metrics ? `${Math.round(totalBookedMinutes / 60)}h` : null}
        isLoading={isLoading}
      />
      <KpiCard
        label="Materials"
        value={metrics ? `${Math.round(totalMaterialUsed)}u` : null}
        isLoading={isLoading}
      />
    </div>
  );
}
