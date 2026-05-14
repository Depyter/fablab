"use client";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportProjectsSection } from "@/components/reports/report-projects-section";
import { ReportResourcesSection } from "@/components/reports/report-resources-section";
import { ReportMaterialsSection } from "@/components/reports/report-materials-section";
import { ReportRevenueSection } from "@/components/reports/report-revenue-section";
import { ReportOverviewSection } from "@/components/reports/report-overview-section";
import type { Id } from "@convex/_generated/dataModel";

interface ReportsClientProps {
  dateFrom: number;
  dateTo: number;
  metrics:
    | {
        projectCount: number;
        projectCountByStatus: Record<string, number> | null;
        totalRevenue: number;
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
      }
    | undefined;
  revenue:
    | {
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
      }
    | undefined;
  downtime:
    | Array<{
        resourceId: Id<"resources">;
        name: string;
        category: string;
        currentStatus: string;
        isUnderMaintenance: boolean;
        totalDowntimeMinutes: number;
        bookingCount: number;
      }>
    | undefined;
}

export function ReportsClient({
  metrics,
  revenue,
  downtime,
}: ReportsClientProps) {
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
