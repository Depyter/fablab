"use client";

import * as React from "react";
import { ReportMaterialUsageCard } from "@/components/reports/charts/report-material-usage-card";
import type { Id } from "@convex/_generated/dataModel";

interface ReportMaterialsSectionProps {
  materialUsage: Array<{
    materialId: Id<"materials">;
    name: string;
    unit: string;
    totalUsed: number;
    totalCost: number;
    currentStock: number;
  }> | null;
  isLoading: boolean;
}

export function ReportMaterialsSection({
  materialUsage,
  isLoading,
}: ReportMaterialsSectionProps) {
  return (
    <ReportMaterialUsageCard
      materialUsage={materialUsage}
      isLoading={isLoading}
    />
  );
}
