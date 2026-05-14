"use client";
import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportProjectsSection } from "@/components/reports/report-projects-section";
import { ReportResourcesSection } from "@/components/reports/report-resources-section";
import { ReportMaterialsSection } from "@/components/reports/report-materials-section";
import { ReportRevenueSection } from "@/components/reports/report-revenue-section";
import { ReportOverviewSection } from "@/components/reports/report-overview-section";

interface ReportsClientProps {
  dateFrom: number;
  dateTo: number;
}

export function ReportsClient({ dateFrom, dateTo }: ReportsClientProps) {
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
    <Tabs
      defaultValue="overview"
      className="w-full flex flex-col min-h-0 flex-1"
    >
      <TabsList variant="line" className="pl-5 pt-2 shrink-0">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
        <TabsTrigger value="materials">Materials</TabsTrigger>
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
      </TabsList>

      <TabsContent
        value="overview"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <ReportOverviewSection
          metrics={{
            projectCount: metrics?.projectCount ?? 0,
            projectCountByStatus: metrics?.projectCountByStatus ?? null,
            totalRevenue: metrics?.totalRevenue ?? 0,
            resourceUtilization: metrics?.resourceUtilization ?? null,
            materialUsage: metrics?.materialUsage ?? null,
          }}
          revenue={{
            monthly: revenue?.monthly ?? null,
            byService: revenue?.byService ?? null,
          }}
          downtime={downtime ?? null}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent
        value="projects"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <ReportProjectsSection
          projectCountByStatus={metrics?.projectCountByStatus ?? null}
          topServices={metrics?.topServices ?? null}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent
        value="resources"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <ReportResourcesSection
          resourceUtilization={metrics?.resourceUtilization ?? null}
          downtime={downtime ?? null}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent
        value="materials"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <ReportMaterialsSection
          materialUsage={metrics?.materialUsage ?? null}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent
        value="revenue"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <ReportRevenueSection
          monthly={revenue?.monthly ?? null}
          byService={revenue?.byService ?? null}
          isLoading={isLoading}
        />
      </TabsContent>
    </Tabs>
  );
}
