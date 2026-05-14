"use client";

import * as React from "react";
import { ReportProjectStatusCard } from "@/components/reports/charts/report-project-status-card";
import { ReportTopServicesCard } from "@/components/reports/charts/report-top-services-card";
import type { Id } from "@convex/_generated/dataModel";

interface ReportProjectsSectionProps {
  projectCountByStatus: Record<string, number> | null;
  topServices: Array<{
    serviceId: Id<"services">;
    serviceName: string;
    projectCount: number;
  }> | null;
  isLoading: boolean;
}

export function ReportProjectsSection({
  projectCountByStatus,
  topServices,
  isLoading,
}: ReportProjectsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportProjectStatusCard
        projectCountByStatus={projectCountByStatus}
        isLoading={isLoading}
      />
      <ReportTopServicesCard topServices={topServices} isLoading={isLoading} />
    </div>
  );
}
