"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
  label: string;
  value: string | number | null;
  subtitle?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

function KpiCard({ label, value, subtitle, icon, isLoading }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? "—"}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
    <div className="flex flex-wrap gap-3">
      <KpiCard
        label="Total Projects"
        value={metrics?.projectCount ?? null}
        subtitle="In selected range"
        isLoading={isLoading}
      />
      <KpiCard
        label="Workshops"
        value={metrics?.workshopCount ?? null}
        subtitle="Held in range"
        isLoading={isLoading}
      />
      <KpiCard
        label="Revenue"
        value={
          metrics?.totalRevenue != null
            ? formatCurrency(metrics.totalRevenue)
            : null
        }
        subtitle="From paid projects"
        isLoading={isLoading}
      />
      <KpiCard
        label="Resource Hours"
        value={metrics ? `${Math.round(totalBookedMinutes / 60)}h` : null}
        subtitle="Total booked"
        isLoading={isLoading}
      />
      <KpiCard
        label="Material Used"
        value={metrics ? `${Math.round(totalMaterialUsed)} units` : null}
        subtitle="Across all usages"
        isLoading={isLoading}
      />
    </div>
  );
}
