"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PIE_COLORS = [
  "var(--chart-1, #2563eb)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #d97706)",
  "var(--chart-4, #dc2626)",
  "var(--chart-5, #8b5cf6)",
  "var(--chart-6, #ec4899)",
  "var(--chart-7, #06b6d4)",
  "var(--chart-8, #f97316)",
];

function ChartTooltip({ active, payload, label }: any) {
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

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{entry.name}</p>
      <p style={{ color: entry.color }}>{entry.payload?.formattedValue}</p>
    </div>
  );
}

export function ReportRevenueSection({
  monthly,
  byService,
  isLoading,
}: ReportRevenueSectionProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const lineChartData = React.useMemo(
    () =>
      monthly?.map((m) => ({
        label: `${MONTH_NAMES[m.month - 1]} ${m.month === 1 ? m.year : ""}`,
        shortLabel: MONTH_NAMES[m.month - 1],
        revenue: m.revenue,
        projects: m.count,
      })) ?? [],
    [monthly],
  );

  const pieChartData = React.useMemo(
    () =>
      byService
        ?.map((svc, i) => ({
          name: svc.serviceName,
          value: svc.revenue,
          formattedValue: formatCurrency(svc.revenue),
          fill: PIE_COLORS[i % PIE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value) ?? [],
    [byService],
  );

  const totalRevenue = React.useMemo(
    () => lineChartData.reduce((sum, m) => sum + m.revenue, 0),
    [lineChartData],
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
      {/* Monthly revenue trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Monthly Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineChartData.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-1, #2563eb)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly?.map((m) => (
                    <TableRow key={`${m.year}-${m.month}`}>
                      <TableCell className="font-medium">
                        {MONTH_NAMES[m.month - 1]} {m.year}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {m.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No revenue data in this period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Revenue by service pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Revenue by Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pieChartData.length > 0 ? (
            <>
              <div className="h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byService?.map((svc) => (
                    <TableRow key={svc.serviceId}>
                      <TableCell className="font-medium">
                        {svc.serviceName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(svc.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {svc.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No revenue data in this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
