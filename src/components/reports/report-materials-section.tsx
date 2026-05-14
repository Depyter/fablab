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
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function ReportMaterialsSection({
  materialUsage,
  isLoading,
}: ReportMaterialsSectionProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const usageChartData = React.useMemo(
    () =>
      materialUsage
        ?.map((m, i) => ({
          name: m.name,
          used: m.totalUsed,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        }))
        .sort((a, b) => b.used - a.used) ?? [],
    [materialUsage],
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
          Material Consumption
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageChartData.length > 0 ? (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  <Bar dataKey="used" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialUsage?.map((m) => (
                  <TableRow key={m.materialId}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-right">
                      {m.totalUsed} {m.unit}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(m.totalCost)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {m.currentStock} {m.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No material usage in this period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
