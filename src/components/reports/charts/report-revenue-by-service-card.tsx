"use client";

import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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
import { PIE_COLORS, PieTooltip } from "./utils";

interface ReportRevenueByServiceCardProps {
  byService: Array<{
    serviceId: Id<"services">;
    serviceName: string;
    revenue: number;
    count: number;
  }> | null;
  isLoading: boolean;
}

export function ReportRevenueByServiceCard({
  byService,
  isLoading,
}: ReportRevenueByServiceCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const chartData = React.useMemo(
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
          Revenue by Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 0 ? (
          <>
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {chartData.map((entry) => (
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
  );
}
