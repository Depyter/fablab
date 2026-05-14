"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

const CHART_COLORS = [
  "var(--chart-1, #2563eb)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #d97706)",
  "var(--chart-4, #dc2626)",
  "var(--chart-5, #8b5cf6)",
  "var(--chart-6, #ec4899)",
  "var(--chart-7, #06b6d4)",
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}h
        </p>
      ))}
    </div>
  );
}

export function ReportResourcesSection({
  resourceUtilization,
  downtime,
  isLoading,
}: ReportResourcesSectionProps) {
  const utilizationChartData = React.useMemo(
    () =>
      resourceUtilization
        ?.map((r, i) => ({
          name: r.name,
          hours: parseFloat((r.totalBookedMinutes / 60).toFixed(1)),
          fill: CHART_COLORS[i % CHART_COLORS.length],
        }))
        .sort((a, b) => b.hours - a.hours) ?? [],
    [resourceUtilization],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Resource Utilization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {utilizationChartData.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizationChartData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resourceUtilization?.map((r) => (
                    <TableRow key={r.resourceId ?? "unassigned"}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">
                        {(r.totalBookedMinutes / 60).toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No resource usage in this period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Downtime */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Resource Status & Downtime
          </CardTitle>
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
                          "text-xs",
                          r.isUnderMaintenance
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-green-200 bg-green-50 text-green-700",
                        )}
                      >
                        {r.currentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.totalDowntimeMinutes > 0
                        ? `${(r.totalDowntimeMinutes / 60).toFixed(0)}h`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.bookingCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No resources found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
