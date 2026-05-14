"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
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
import { CHART_COLORS, ChartTooltip, ChartContainer } from "./utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Review",
  approved: "Fabrication",
  completed: "Payment",
  paid: "Claim",
  claimed: "Claimed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_ORDER = [
  "pending",
  "approved",
  "completed",
  "paid",
  "claimed",
  "rejected",
  "cancelled",
];

interface ReportProjectStatusCardProps {
  projectCountByStatus: Record<string, number> | null;
  isLoading: boolean;
}

export function ReportProjectStatusCard({
  projectCountByStatus,
  isLoading,
}: ReportProjectStatusCardProps) {
  const totalProjects = React.useMemo(
    () =>
      projectCountByStatus
        ? Object.values(projectCountByStatus).reduce((a, b) => a + b, 0)
        : 0,
    [projectCountByStatus],
  );

  const chartData = React.useMemo(
    () =>
      projectCountByStatus
        ? STATUS_ORDER.filter((s) => projectCountByStatus[s] != null).map(
            (status) => ({
              status: STATUS_LABELS[status] ?? status,
              count: projectCountByStatus[status] ?? 0,
              fill: CHART_COLORS[
                STATUS_ORDER.indexOf(status) % CHART_COLORS.length
              ],
            }),
          )
        : [],
    [projectCountByStatus],
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
          Projects by Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 0 ? (
          <>
            <ChartContainer className="h-48">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="status"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  width={90}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell className="font-medium">{row.status}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalProjects > 0
                        ? `${((row.count / totalProjects) * 100).toFixed(0)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No projects in this period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
