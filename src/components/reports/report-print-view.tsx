"use client";

import * as React from "react";

interface PrintData {
  metrics: {
    projectCount: number;
    projectCountByStatus: Record<string, number> | null;
    workshopCount: number;
    totalRevenue: number;
    totalMaterialCost: number;
    topServices: Array<{ serviceName: string; projectCount: number }> | null;
    resourceUtilization: Array<{
      name: string;
      totalBookedMinutes: number;
    }> | null;
    materialUsage: Array<{
      name: string;
      unit: string;
      totalUsed: number;
      totalCost: number;
      currentStock: number;
    }> | null;
  } | null;
  revenue: {
    monthly: Array<{
      year: number;
      month: number;
      revenue: number;
      count: number;
    }> | null;
    byService: Array<{
      serviceName: string;
      revenue: number;
      count: number;
    }> | null;
  } | null;
  downtime: Array<{
    name: string;
    currentStatus: string;
    isUnderMaintenance: boolean;
    totalDowntimeMinutes: number;
    bookingCount: number;
  }> | null;
  dateFrom: number;
  dateTo: number;
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

interface ReportPrintViewProps {
  data: PrintData;
}

export function ReportPrintView({ data }: ReportPrintViewProps) {
  const m = data.metrics;
  const r = data.revenue;
  const d = data.downtime;
  const totalHours = m?.resourceUtilization
    ? Math.round(
        m.resourceUtilization.reduce((s, x) => s + x.totalBookedMinutes, 0) /
          60,
      )
    : 0;
  const totalMaterialUnits = m?.materialUsage
    ? Math.round(m.materialUsage.reduce((s, x) => s + x.totalUsed, 0))
    : 0;
  const totalMaterialCost = m?.materialUsage
    ? m.materialUsage.reduce((s, x) => s + x.totalCost, 0)
    : 0;
  const totalProjects = m?.projectCount ?? 0;
  const workshopCount = m?.workshopCount ?? 0;
  const completedStages = (() => {
    const s = m?.projectCountByStatus ?? {};
    return (s["completed"] ?? 0) + (s["paid"] ?? 0) + (s["claimed"] ?? 0);
  })();

  return (
    <>
      <style>{`@media print{body{visibility:hidden}body *{visibility:hidden}.print-root,.print-root *{visibility:visible}.print-root{position:absolute;left:0;top:0;width:100%}}`}</style>
      <div className="print-root hidden print:block print:p-8 print:text-black print:bg-white print:text-xs">
        <h1 className="print:text-xl print:font-bold print:mb-1">
          FabLab Report
        </h1>
        <p className="print:text-gray-600 print:mb-4">
          {formatDate(data.dateFrom)} – {formatDate(data.dateTo)} · Generated{" "}
          {new Date().toLocaleDateString()}
        </p>

        <h2 className="print:text-sm print:font-semibold print:mb-1 print:border-b print:pb-1">
          Summary
        </h2>
        <table className="print:w-full print:mb-4 print:border-collapse">
          <tbody>
            <tr>
              <td className="print:py-0.5 print:pr-4 print:font-medium">
                Total Projects
              </td>
              <td>{totalProjects}</td>
            </tr>
            <tr>
              <td className="print:py-0.5 print:pr-4 print:font-medium">
                Workshops
              </td>
              <td>{workshopCount}</td>
            </tr>
            <tr>
              <td className="print:py-0.5 print:pr-4 print:font-medium">
                Completed / Paid / Claimed
              </td>
              <td>
                {completedStages}{" "}
                {totalProjects > 0
                  ? `(${Math.round((completedStages / totalProjects) * 100)}%)`
                  : ""}
              </td>
            </tr>
            <tr>
              <td className="print:py-0.5 print:pr-4 print:font-medium">
                Total Revenue
              </td>
              <td>{formatCurrency(m?.totalRevenue ?? 0)}</td>
            </tr>
            <tr>
              <td className="print:py-0.5 print:pr-4 print:font-medium">
                Hours Booked
              </td>
              <td>{totalHours}h</td>
            </tr>
            <tr>
              <td className="print:py-0.5 print:pr-4 print:font-medium">
                Materials Used
              </td>
              <td>
                {totalMaterialUnits} units · {formatCurrency(totalMaterialCost)}
              </td>
            </tr>
          </tbody>
        </table>

        <h2 className="print:text-sm print:font-semibold print:mb-1 print:border-b print:pb-1">
          Projects by Status
        </h2>
        <table className="print:w-full print:mb-4 print:border-collapse print:border print:border-gray-300">
          <thead>
            <tr className="print:bg-gray-100">
              <th className="print:border print:px-2 print:py-0.5 print:text-left">
                Status
              </th>
              <th className="print:border print:px-2 print:py-0.5 print:text-right">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(m?.projectCountByStatus ?? {}).map(([k, v]) => (
              <tr key={k}>
                <td className="print:border print:px-2 print:py-0.5">{k}</td>
                <td className="print:border print:px-2 print:py-0.5 print:text-right">
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="print:text-sm print:font-semibold print:mb-1 print:border-b print:pb-1">
          Resource Utilization
        </h2>
        <table className="print:w-full print:mb-4 print:border-collapse print:border print:border-gray-300">
          <thead>
            <tr className="print:bg-gray-100">
              <th className="print:border print:px-2 print:py-0.5 print:text-left">
                Resource
              </th>
              <th className="print:border print:px-2 print:py-0.5 print:text-right">
                Hours
              </th>
            </tr>
          </thead>
          <tbody>
            {m?.resourceUtilization
              ?.sort((a, b) => b.totalBookedMinutes - a.totalBookedMinutes)
              .map((r) => (
                <tr key={r.name}>
                  <td className="print:border print:px-2 print:py-0.5">
                    {r.name}
                  </td>
                  <td className="print:border print:px-2 print:py-0.5 print:text-right">
                    {(r.totalBookedMinutes / 60).toFixed(1)}h
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {m?.materialUsage?.length ? (
          <>
            <h2 className="print:text-sm print:font-semibold print:mb-1 print:border-b print:pb-1">
              Material Usage
            </h2>
            <table className="print:w-full print:mb-4 print:border-collapse print:border print:border-gray-300">
              <thead>
                <tr className="print:bg-gray-100">
                  <th className="print:border print:px-2 print:py-0.5 print:text-left">
                    Material
                  </th>
                  <th className="print:border print:px-2 print:py-0.5 print:text-right">
                    Used
                  </th>
                  <th className="print:border print:px-2 print:py-0.5 print:text-right">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.materialUsage
                  .sort((a, b) => b.totalCost - a.totalCost)
                  .map((mat) => (
                    <tr key={mat.name}>
                      <td className="print:border print:px-2 print:py-0.5">
                        {mat.name}
                      </td>
                      <td className="print:border print:px-2 print:py-0.5 print:text-right">
                        {mat.totalUsed} {mat.unit}
                      </td>
                      <td className="print:border print:px-2 print:py-0.5 print:text-right">
                        {formatCurrency(mat.totalCost)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        ) : null}

        {r?.monthly?.length ? (
          <>
            <h2 className="print:text-sm print:font-semibold print:mb-1 print:border-b print:pb-1">
              Monthly Revenue
            </h2>
            <table className="print:w-full print:mb-4 print:border-collapse print:border print:border-gray-300">
              <thead>
                <tr className="print:bg-gray-100">
                  <th className="print:border print:px-2 print:py-0.5 print:text-left">
                    Month
                  </th>
                  <th className="print:border print:px-2 print:py-0.5 print:text-right">
                    Revenue
                  </th>
                  <th className="print:border print:px-2 print:py-0.5 print:text-right">
                    Projects
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.monthly.map((mo) => (
                  <tr key={`${mo.year}-${mo.month}`}>
                    <td className="print:border print:px-2 print:py-0.5">
                      {MONTH_NAMES[mo.month - 1]} {mo.year}
                    </td>
                    <td className="print:border print:px-2 print:py-0.5 print:text-right">
                      {formatCurrency(mo.revenue)}
                    </td>
                    <td className="print:border print:px-2 print:py-0.5 print:text-right">
                      {mo.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        {d?.length ? (
          <>
            <h2 className="print:text-sm print:font-semibold print:mb-1 print:border-b print:pb-1">
              Resource Status
            </h2>
            <table className="print:w-full print:mb-4 print:border-collapse print:border print:border-gray-300">
              <thead>
                <tr className="print:bg-gray-100">
                  <th className="print:border print:px-2 print:py-0.5 print:text-left">
                    Resource
                  </th>
                  <th className="print:border print:px-2 print:py-0.5 print:text-left">
                    Status
                  </th>
                  <th className="print:border print:px-2 print:py-0.5 print:text-right">
                    Bookings
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.map((res) => (
                  <tr key={res.name}>
                    <td className="print:border print:px-2 print:py-0.5">
                      {res.name}
                    </td>
                    <td className="print:border print:px-2 print:py-0.5">
                      {res.isUnderMaintenance ? "⚠ " : ""}
                      {res.currentStatus}
                    </td>
                    <td className="print:border print:px-2 print:py-0.5 print:text-right">
                      {res.bookingCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </div>
    </>
  );
}
