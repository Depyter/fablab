"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportRevenueByServiceCard } from "@/components/reports/charts/report-revenue-by-service-card";
import { ReportResourceDowntimeCard } from "@/components/reports/charts/report-resource-downtime-card";
import { ReportProjectStatusCard } from "@/components/reports/charts/report-project-status-card";
import { ReportMaterialUsageCard } from "@/components/reports/charts/report-material-usage-card";
import { ReportResourceUtilizationCard } from "@/components/reports/charts/report-resource-utilization-card";
import type { Id } from "@convex/_generated/dataModel";

interface OverviewMetrics {
  projectCount: number;
  projectCountByStatus: Record<string, number> | null;
  totalRevenue: number;
  resourceUtilization: Array<{
    resourceId: Id<"resources"> | null;
    name: string;
    totalBookedMinutes: number;
  }> | null;
  materialUsage: Array<{
    materialId: Id<"materials">;
    name: string;
    unit: string;
    totalUsed: number;
    totalCost: number;
    currentStock: number;
  }> | null;
}

interface ReportOverviewSectionProps {
  metrics: OverviewMetrics | null;
  revenue: {
    monthly: Array<{
      year: number;
      month: number;
      revenue: number;
      count: number;
    }> | null;
    byService: Array<{
      serviceId: Id<"services">;
      serviceName: string;
      revenue: number;
      count: number;
    }> | null;
  } | null;
  downtime: Array<{
    resourceId: Id<"resources">;
    name: string;
    category: string;
    currentStatus: string;
    isUnderMaintenance: boolean;
    totalDowntimeMinutes: number;
    bookingCount: number;
  }> | null;
  isLoading: boolean;
}

function KpiBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0 rounded-xl border bg-background px-4 py-3">
      <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
        {label}
      </span>
      <span className="text-xl font-bold tabular-nums leading-tight">
        {value}
      </span>
    </div>
  );
}

export function ReportOverviewSection({
  metrics,
  revenue,
  downtime,
  isLoading,
}: ReportOverviewSectionProps) {
  const totalMaterialUsed = React.useMemo(
    () =>
      metrics?.materialUsage?.reduce<number>(
        (sum, m) => sum + m.totalUsed,
        0,
      ) ?? 0,
    [metrics?.materialUsage],
  );

  const totalBookedHours = React.useMemo(
    () =>
      Math.round(
        (metrics?.resourceUtilization?.reduce<number>(
          (sum, r) => sum + r.totalBookedMinutes,
          0,
        ) ?? 0) / 60,
      ),
    [metrics?.resourceUtilization],
  );

  const serviceCount = React.useMemo(
    () => revenue?.byService?.length ?? 0,
    [revenue?.byService],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-18 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-h-0">
      {/* KPI row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiBadge
            label="Revenue"
            value={formatCurrency(metrics.totalRevenue)}
          />
          <KpiBadge label="Projects" value={metrics.projectCount} />
          <KpiBadge
            label="Materials"
            value={`${Math.round(totalMaterialUsed)}u`}
          />
          <KpiBadge label="Hours" value={`${totalBookedHours}h`} />
          <KpiBadge label="Services" value={serviceCount} />
        </div>
      )}

      {/* Row 1: Revenue | Projects | Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportRevenueByServiceCard
          byService={revenue?.byService ?? null}
          isLoading={isLoading}
        />
        <ReportProjectStatusCard
          projectCountByStatus={metrics?.projectCountByStatus ?? null}
          isLoading={isLoading}
        />
        <ReportMaterialUsageCard
          materialUsage={metrics?.materialUsage ?? null}
          isLoading={isLoading}
        />
      </div>

      {/* Row 2: Resources | Downtime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportResourceUtilizationCard
          resourceUtilization={metrics?.resourceUtilization ?? null}
          isLoading={isLoading}
        />
        <ReportResourceDowntimeCard downtime={downtime} isLoading={isLoading} />
      </div>
    </div>
  );
}
