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

const CHART_COLORS = [
  "var(--chart-1, #2563eb)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #d97706)",
  "var(--chart-4, #dc2626)",
  "var(--chart-5, #8b5cf6)",
  "var(--chart-6, #ec4899)",
  "var(--chart-7, #06b6d4)",
];

interface ReportProjectsSectionProps {
  projectCountByStatus: Record<string, number> | null;
  topServices: Array<{
    serviceId: Id<"services">;
    serviceName: string;
    projectCount: number;
  }> | null;
  isLoading: boolean;
}

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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function ReportProjectsSection({
  projectCountByStatus,
  topServices,
  isLoading,
}: ReportProjectsSectionProps) {
  const totalProjects = React.useMemo(
    () =>
      projectCountByStatus
        ? Object.values(projectCountByStatus).reduce((a, b) => a + b, 0)
        : 0,
    [projectCountByStatus],
  );

  const statusChartData = React.useMemo(
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

  const servicesChartData = React.useMemo(
    () =>
      topServices?.map((svc) => ({
        name: svc.serviceName,
        projects: svc.projectCount,
      })) ?? [],
    [topServices],
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
      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Projects by Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusChartData.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
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
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusChartData.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell className="font-medium">
                        {row.status}
                      </TableCell>
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

      {/* Top services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {servicesChartData.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={servicesChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="projects" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServices?.map((svc) => (
                    <TableRow key={svc.serviceId}>
                      <TableCell className="font-medium">
                        {svc.serviceName}
                      </TableCell>
                      <TableCell className="text-right">
                        {svc.projectCount}
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
    </div>
  );
}
