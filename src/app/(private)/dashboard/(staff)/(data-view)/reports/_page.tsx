"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ViewHeaderMain } from "@/components/ui/view-header";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import { ReportDateRange } from "@/components/reports/report-date-range";
import { ReportExportButton } from "@/components/reports/report-export";
import type { Id } from "@convex/_generated/dataModel";
import { getCurrentTimestamp } from "@/lib/lab-time";
import { ReportsClient } from "./_client";

interface HeaderData {
  metrics: {
    projectCount: number;
    projectCountByStatus: Record<string, number> | null;
    workshopCount: number;
    totalRevenue: number;
    totalMaterialCost: number;
    topServices: Array<{
      serviceId: Id<"services">;
      serviceName: string;
      projectCount: number;
    }> | null;
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
  } | null;
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
}

function ReportsPageHeader({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  exportData,
}: {
  dateFrom: number;
  dateTo: number;
  onDateFromChange: (value: number) => void;
  onDateToChange: (value: number) => void;
  exportData: HeaderData | null;
}) {
  return (
    <DataViewPageHeader>
      <ViewHeaderMain>
        <h1 className="text-lg font-semibold shrink-0">Reports</h1>
        <div className="flex shrink-0 items-center gap-2 ml-auto">
          {exportData && (
            <ReportExportButton
              data={{
                ...exportData,
                dateFrom,
                dateTo,
              }}
            />
          )}
          <ReportDateRange
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
          />
        </div>
      </ViewHeaderMain>
    </DataViewPageHeader>
  );
}

function getMonthStart() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function useMonthRange() {
  const now = React.useMemo(() => getCurrentTimestamp(), []);
  const monthStart = React.useMemo(() => getMonthStart(), []);

  const [dateFrom, setDateFrom] = React.useState(monthStart);
  const [dateTo, setDateTo] = React.useState(now);

  return { dateFrom, dateTo, setDateFrom, setDateTo };
}

export function ReportsPageContent() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useMonthRange();

  const metrics = useQuery(api.reports.query.getReportMetrics, {
    dateFrom,
    dateTo,
  });
  const revenue = useQuery(api.reports.query.getRevenueBreakdown, {
    dateFrom,
    dateTo,
  });
  const downtime = useQuery(api.reports.query.getResourceDowntime, {
    dateFrom,
    dateTo,
  });

  const dataLoaded =
    metrics !== undefined && revenue !== undefined && downtime !== undefined;
  const exportData: HeaderData | null = dataLoaded
    ? {
        metrics: metrics as HeaderData["metrics"],
        revenue: revenue as HeaderData["revenue"],
        downtime: downtime as HeaderData["downtime"],
      }
    : null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <ReportsPageHeader
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        exportData={exportData}
      />
      <ReportsClient
        dateFrom={dateFrom}
        dateTo={dateTo}
        metrics={metrics}
        revenue={revenue}
        downtime={downtime}
      />
    </div>
  );
}
