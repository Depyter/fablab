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
import type { Id } from "@convex/_generated/dataModel";
import { CHART_COLORS, ChartTooltip, ChartContainer } from "./utils";

interface ReportMaterialUsageCardProps {
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

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ReportMaterialUsageCard({
  materialUsage,
  isLoading,
}: ReportMaterialUsageCardProps) {
  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  const chartData = React.useMemo(
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
        {chartData.length > 0 ? (
          <>
            <ChartContainer className="h-56">
              <BarChart data={chartData}>
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
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="used" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
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
