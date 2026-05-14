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
import { ChartTooltip } from "./utils";

interface ReportTopServicesCardProps {
  topServices: Array<{
    serviceId: Id<"services">;
    serviceName: string;
    projectCount: number;
  }> | null;
  isLoading: boolean;
}

export function ReportTopServicesCard({
  topServices,
  isLoading,
}: ReportTopServicesCardProps) {
  const chartData = React.useMemo(
    () =>
      topServices?.map((svc) => ({
        name: svc.serviceName,
        projects: svc.projectCount,
      })) ?? [],
    [topServices],
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
        <CardTitle className="text-sm font-medium">Top Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 0 ? (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
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
  );
}
