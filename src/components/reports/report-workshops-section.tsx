"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportWorkshopsSectionProps {
  workshopCount: number | null;
  isLoading: boolean;
}

export function ReportWorkshopsSection({
  workshopCount,
  isLoading,
}: ReportWorkshopsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Workshop Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
          </div>
        ) : (
          <div>
            <div className="text-3xl font-bold">{workshopCount ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Workshops held in this period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
