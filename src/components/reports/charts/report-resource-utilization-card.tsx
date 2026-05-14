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
import type { Id } from "@convex/_generated/dataModel";
import { CHART_COLORS, ChartTooltip } from "./utils";

interface ReportResourceUtilizationCardProps {
  resourceUtilization: Array<{
    resourceId: Id<"resources"> | null;
    name: string;
    totalBookedMinutes: number;
  }> | null;
  isLoading: boolean;
}

export function ReportResourceUtilizationCard({
  resourceUtilization,
  isLoading,
}: ReportResourceUtilizationCardProps) {
  const chartData = React.useMemo(
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
        <CardTitle className="text-sm font-medium">
          Resource Utilization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 0 ? (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  <Tooltip content={<ChartTooltip />} />
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
  );
}
