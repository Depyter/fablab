"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { ChartTooltip, ChartContainer } from "./utils";

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

interface ReportMonthlyRevenueCardProps {
  monthly: Array<{
    year: number;
    month: number;
    revenue: number;
    count: number;
  }> | null;
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ReportMonthlyRevenueCard({
  monthly,
  isLoading,
}: ReportMonthlyRevenueCardProps) {
  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  const chartData = React.useMemo(
    () =>
      monthly?.map((m) => ({
        label: `${MONTH_NAMES[m.month - 1]} ${m.month === 1 ? m.year : ""}`,
        shortLabel: MONTH_NAMES[m.month - 1],
        revenue: m.revenue,
        projects: m.count,
      })) ?? [],
    [monthly],
  );

  const totalRevenue = React.useMemo(
    () => chartData.reduce((sum, m) => sum + m.revenue, 0),
    [chartData],
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
          Monthly Revenue Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 0 ? (
          <>
            <ChartContainer className="h-56">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
            </ChartContainer>
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
  );
}
