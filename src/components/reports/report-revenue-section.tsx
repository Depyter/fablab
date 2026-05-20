"use client";

import * as React from "react";
import { ReportMonthlyRevenueCard } from "@/components/reports/charts/report-monthly-revenue-card";
import { ReportRevenueByServiceCard } from "@/components/reports/charts/report-revenue-by-service-card";
import type { Id } from "@convex/_generated/dataModel";

interface ReportRevenueSectionProps {
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
  isLoading: boolean;
}

export function ReportRevenueSection({
  monthly,
  byService,
  isLoading,
}: ReportRevenueSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportMonthlyRevenueCard monthly={monthly} isLoading={isLoading} />
      <ReportRevenueByServiceCard byService={byService} isLoading={isLoading} />
    </div>
  );
}
