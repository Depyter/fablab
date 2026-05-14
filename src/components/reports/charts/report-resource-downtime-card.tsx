"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";

interface ReportResourceDowntimeCardProps {
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

function formatDowntime(minutes: number) {
  if (minutes === 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function ReportResourceDowntimeCard({ downtime, isLoading }: ReportResourceDowntimeCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Resource Status & Downtime</CardTitle>
      </CardHeader>
      <CardContent>
        {downtime && downtime.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Downtime</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {downtime.map((r) => (
                <TableRow key={r.resourceId}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-normal",
                        r.isUnderMaintenance
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300",
                      )}
                    >
                      {r.currentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDowntime(r.totalDowntimeMinutes)}
                  </TableCell>
                  <TableCell className="text-right">{r.bookingCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No downtime data for this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
