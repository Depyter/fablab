"use client";

import * as React from "react";
import { ReportResourceUtilizationCard } from "@/components/reports/charts/report-resource-utilization-card";
import { ReportResourceDowntimeCard } from "@/components/reports/charts/report-resource-downtime-card";
import type { Id } from "@convex/_generated/dataModel";

interface ReportResourcesSectionProps {
  resourceUtilization: Array<{
    resourceId: Id<"resources"> | null;
    name: string;
    totalBookedMinutes: number;
  }> | null;
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

export function ReportResourcesSection({
  resourceUtilization,
  downtime,
  isLoading,
}: ReportResourcesSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportResourceUtilizationCard
        resourceUtilization={resourceUtilization}
        isLoading={isLoading}
      />
      <ReportResourceDowntimeCard downtime={downtime} isLoading={isLoading} />
    </div>
  );
}
