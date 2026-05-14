"use client";
import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfLabMonth, getCurrentTimestamp } from "@/lib/lab-time";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import { ReportDateRange } from "@/components/reports/report-date-range";
import { ReportProjectsSection } from "@/components/reports/report-projects-section";
import { ReportResourcesSection } from "@/components/reports/report-resources-section";
import { ReportMaterialsSection } from "@/components/reports/report-materials-section";
import { ReportRevenueSection } from "@/components/reports/report-revenue-section";
import { ReportWorkshopsSection } from "@/components/reports/report-workshops-section";

function useMonthRange() {
  const now = React.useMemo(() => getCurrentTimestamp(), []);
  const monthStart = React.useMemo(() => startOfLabMonth(now).getTime(), [now]);

  const [dateFrom, setDateFrom] = React.useState(monthStart);
  const [dateTo, setDateTo] = React.useState(now);

  return { dateFrom, dateTo, setDateFrom, setDateTo };
}

export function ReportsClient() {
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

  const isLoading =
    metrics === undefined || revenue === undefined || downtime === undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      {/* Date range selector */}
      <ReportDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {/* KPI cards */}
      <ReportKpiCards metrics={metrics ?? null} isLoading={isLoading} />

      {/* Tabbed detail sections */}
      <Tabs defaultValue="projects" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="workshops">Workshops</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="min-h-0 flex-1 pt-4">
          <ReportProjectsSection
            projectCountByStatus={metrics?.projectCountByStatus ?? null}
            topServices={metrics?.topServices ?? null}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="workshops" className="min-h-0 flex-1 pt-4">
          <ReportWorkshopsSection
            workshopCount={metrics?.workshopCount ?? null}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="resources" className="min-h-0 flex-1 pt-4">
          <ReportResourcesSection
            resourceUtilization={metrics?.resourceUtilization ?? null}
            downtime={downtime ?? null}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="materials" className="min-h-0 flex-1 pt-4">
          <ReportMaterialsSection
            materialUsage={metrics?.materialUsage ?? null}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="revenue" className="min-h-0 flex-1 pt-4">
          <ReportRevenueSection
            monthly={revenue?.monthly ?? null}
            byService={revenue?.byService ?? null}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
