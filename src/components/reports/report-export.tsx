"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as XLSX from "xlsx";
import type { Id } from "@convex/_generated/dataModel";

interface ExportData {
  metrics: {
    projectCount: number;
    projectCountByStatus: Record<string, number> | null;
    workshopCount: number;
    totalRevenue: number;
    totalMaterialCost: number;
    topServices: Array<{
      serviceId: Id<"services">;
      serviceName: string;
      projectCount: number;
    }> | null;
    resourceUtilization: Array<{
      resourceId: Id<"resources"> | null;
      name: string;
      totalBookedMinutes: number;
    }> | null;
    materialUsage: Array<{
      materialId: Id<"materials">;
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
      serviceId: Id<"services">;
      serviceName: string;
      revenue: number;
      count: number;
    }> | null;
  } | null;
  downtime: Array<{
    resourceId: Id<"resources">;
    name: string;
    category: string;
    currentStatus: string;
    isUnderMaintenance: boolean;
    totalDowntimeMinutes: number;
    bookingCount: number;
  }> | null;
  dateFrom: number;
  dateTo: number;
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
}

function buildWorkbook(data: ExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const m = data.metrics;
  const r = data.revenue;
  const d = data.downtime;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const totalHours = m?.resourceUtilization
    ? Math.round(
        m.resourceUtilization.reduce((s, r) => s + r.totalBookedMinutes, 0) /
          60,
      )
    : 0;

  const totalMaterialUnits = m?.materialUsage
    ? Math.round(m.materialUsage.reduce((s, mat) => s + mat.totalUsed, 0))
    : 0;

  const totalMaterialCost = m?.materialUsage
    ? m.materialUsage.reduce((s, mat) => s + mat.totalCost, 0)
    : 0;

  const totalProjects = m?.projectCount ?? 0;
  const avgRevenuePerProject =
    totalProjects > 0 && m?.totalRevenue
      ? Math.round(m.totalRevenue / totalProjects)
      : 0;

  const completedStages = (() => {
    const byStatus = m?.projectCountByStatus ?? {};
    return (
      (byStatus["completed"] ?? 0) +
      (byStatus["paid"] ?? 0) +
      (byStatus["claimed"] ?? 0)
    );
  })();

  const totalRevenue = m?.totalRevenue ?? 0;

  const summaryRows: unknown[][] = [
    ["FabLab Report", ""],
    ["Period", `${formatDate(data.dateFrom)} – ${formatDate(data.dateTo)}`],
    ["Generated", new Date().toLocaleString()],
    [],
    ["KEY METRICS", ""],
    ["Total Projects", totalProjects],
    ["   Workshops", m?.workshopCount ?? 0],
    ["   Regular Projects", totalProjects - (m?.workshopCount ?? 0)],
    ["Completed / Paid / Claimed", completedStages],
    [
      "Completion Rate",
      totalProjects > 0
        ? `${Math.round((completedStages / totalProjects) * 100)}%`
        : "—",
    ],
    [],
    ["Total Revenue", fmt(totalRevenue)],
    ["Avg Revenue / Project", fmt(avgRevenuePerProject)],
    [],
    ["Total Hours Booked", `${totalHours}h`],
    ["Materials Used", `${totalMaterialUnits} units`],
    ["Material Cost", fmt(totalMaterialCost)],
    [
      "Material Cost Ratio",
      totalRevenue > 0
        ? `${((totalMaterialCost / totalRevenue) * 100).toFixed(0)}% of revenue`
        : "—",
    ],
    [],
    ["Services Rendered", r?.byService?.length ?? 0],
    ["Resources Tracked", m?.resourceUtilization?.length ?? 0],
    [
      "Resources in Maintenance",
      d?.filter((r) => r.isUnderMaintenance).length ?? 0,
    ],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Dashboard");

  const byStatus = m?.projectCountByStatus;
  if (byStatus) {
    const entries = Object.entries(byStatus);
    const total = entries.reduce((s, [, c]) => s + c, 0);
    const projectsRows: unknown[][] = [
      ["Status", "Count", "%"] as string[],
      ...entries
        .sort(([, a], [, b]) => b - a)
        .map(([status, count]) => [
          status,
          count,
          total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "—",
        ]),
      [],
      ["Total", total, "100%"],
    ];
    const projectsSheet = XLSX.utils.aoa_to_sheet(projectsRows);
    projectsSheet["!cols"] = [{ wch: 18 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, projectsSheet, "Projects");
  }

  if (m) {
    const workshopCount = m.workshopCount ?? 0;
    const projectsWithoutWorkshops = totalProjects - workshopCount;
    const workshopsRows: unknown[][] = [
      ["Metric", "Value"],
      ["Workshop Projects", workshopCount],
      ["Regular Projects", projectsWithoutWorkshops],
      ["Total Projects", totalProjects],
      [
        "Workshop Share",
        totalProjects > 0
          ? `${((workshopCount / totalProjects) * 100).toFixed(1)}%`
          : "—",
      ],
    ];
    const workshopsSheet = XLSX.utils.aoa_to_sheet(workshopsRows);
    workshopsSheet["!cols"] = [{ wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, workshopsSheet, "Workshops");
  }

  if (m?.topServices?.length) {
    const totalSvc = m.topServices.reduce((s, svc) => s + svc.projectCount, 0);
    const servicesRows: unknown[][] = [
      ["Service", "Project Count", "%", "Rank"],
      ...m.topServices
        .sort((a, b) => b.projectCount - a.projectCount)
        .map((svc, i) => [
          svc.serviceName,
          svc.projectCount,
          totalSvc > 0
            ? `${((svc.projectCount / totalSvc) * 100).toFixed(1)}%`
            : "—",
          i + 1,
        ]),
      [],
      ["Total", totalSvc, "100%", ""],
    ];
    const servicesSheet = XLSX.utils.aoa_to_sheet(servicesRows);
    servicesSheet["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, servicesSheet, "Top Services");
  }

  if (m?.resourceUtilization?.length) {
    const maxHours = Math.max(
      ...m.resourceUtilization.map((r) => r.totalBookedMinutes / 60),
      1,
    );
    const resourceRows: unknown[][] = [
      ["Resource", "Booked Hours", "% of Busiest", "Rank"],
      ...m.resourceUtilization
        .sort((a, b) => b.totalBookedMinutes - a.totalBookedMinutes)
        .map((r, i) => [
          r.name,
          parseFloat((r.totalBookedMinutes / 60).toFixed(1)),
          `${((r.totalBookedMinutes / 60 / maxHours) * 100).toFixed(0)}%`,
          i + 1,
        ]),
      [],
      [
        "Total",
        parseFloat(
          (
            m.resourceUtilization.reduce(
              (s, r) => s + r.totalBookedMinutes,
              0,
            ) / 60
          ).toFixed(1),
        ),
        "100%",
        "",
      ],
    ];
    const resourceSheet = XLSX.utils.aoa_to_sheet(resourceRows);
    resourceSheet["!cols"] = [
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, resourceSheet, "Resources");
  }

  if (m?.materialUsage?.length) {
    const totalMatCost = m.materialUsage.reduce(
      (s, mat) => s + mat.totalCost,
      0,
    );
    const materialRows: unknown[][] = [
      [
        "Material",
        "Unit",
        "Used",
        "Cost",
        "% of Total Cost",
        "In Stock",
        "Low Stock?",
      ],
      ...m.materialUsage
        .sort((a, b) => b.totalCost - a.totalCost)
        .map((mat) => [
          mat.name,
          mat.unit,
          mat.totalUsed,
          mat.totalCost,
          totalMatCost > 0
            ? `${((mat.totalCost / totalMatCost) * 100).toFixed(1)}%`
            : "—",
          mat.currentStock,
          mat.currentStock < mat.totalUsed * 0.2 ? "⚠ Yes" : "No",
        ]),
      [],
      [
        "Total",
        "",
        m.materialUsage.reduce((s, mat) => s + mat.totalUsed, 0),
        totalMatCost,
        "100%",
        "",
        "",
      ],
    ];
    const materialSheet = XLSX.utils.aoa_to_sheet(materialRows);
    materialSheet["!cols"] = [
      { wch: 24 },
      { wch: 8 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, materialSheet, "Materials");
  }

  if (r?.monthly?.length) {
    const monthlyData = r.monthly;
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
    let cumulative = 0;
    const revenueRows: unknown[][] = [
      ["Month", "Revenue", "Projects", "Avg/Project", "Cumulative Revenue"],
      ...monthlyData.map((mo) => {
        cumulative += mo.revenue;
        return [
          `${MONTH_NAMES[mo.month - 1]} ${mo.year}`,
          mo.revenue,
          mo.count,
          mo.count > 0 ? Math.round(mo.revenue / mo.count) : 0,
          cumulative,
        ];
      }),
      [],
      [
        "Total",
        cumulative,
        monthlyData.reduce((s, mo) => s + mo.count, 0),
        "",
        "",
      ],
    ];
    const revenueSheet = XLSX.utils.aoa_to_sheet(revenueRows);
    revenueSheet["!cols"] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, revenueSheet, "Revenue");
  }

  if (r?.byService?.length) {
    const totalByServiceRev = r.byService.reduce(
      (s, svc) => s + svc.revenue,
      0,
    );
    const byServiceRows: unknown[][] = [
      ["Service", "Revenue", "% of Total", "Projects", "Rev/Project", "Rank"],
      ...r.byService
        .sort((a, b) => b.revenue - a.revenue)
        .map((svc, i) => [
          svc.serviceName,
          svc.revenue,
          totalByServiceRev > 0
            ? `${((svc.revenue / totalByServiceRev) * 100).toFixed(1)}%`
            : "—",
          svc.count,
          svc.count > 0 ? Math.round(svc.revenue / svc.count) : 0,
          i + 1,
        ]),
      [],
      ["Total", totalByServiceRev, "100%", "", "", ""],
    ];
    const byServiceSheet = XLSX.utils.aoa_to_sheet(byServiceRows);
    byServiceSheet["!cols"] = [
      { wch: 26 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, byServiceSheet, "Revenue by Service");
  }

  if (d?.length) {
    const maintenanceCount = d.filter((r) => r.isUnderMaintenance).length;
    const downtimeRows: unknown[][] = [
      [
        "Resource",
        "Category",
        "Status",
        "Downtime (hours)",
        "Bookings",
        "Impact",
      ],
      ...d
        .sort((a, b) => b.totalDowntimeMinutes - a.totalDowntimeMinutes)
        .map((res) => [
          res.name,
          res.category,
          res.currentStatus,
          parseFloat((res.totalDowntimeMinutes / 60).toFixed(1)),
          res.bookingCount,
          res.isUnderMaintenance ? "⚠ Down" : "✓ Active",
        ]),
      [],
      ["Total Resources", d.length, "", "", "", ""],
      ["Under Maintenance", maintenanceCount, "", "", "", ""],
      ["Active", d.length - maintenanceCount, "", "", "", ""],
    ];
    const downtimeSheet = XLSX.utils.aoa_to_sheet(downtimeRows);
    downtimeSheet["!cols"] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, downtimeSheet, "Resource Status");
  }

  return wb;
}

interface ReportExportButtonProps {
  data: ExportData;
}

export function ReportExportButton({ data }: ReportExportButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const handleExcel = React.useCallback(() => {
    setExporting(true);
    setOpen(false);
    try {
      const wb = buildWorkbook(data);
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fablab-report-${formatDate(data.dateFrom)}–${formatDate(data.dateTo)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [data]);

  const disabled = !data.metrics;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-9 items-center gap-1.5 border-2 border-black bg-fab-teal px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="size-4" strokeWidth={3} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-56 border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]"
      >
        <PopoverHeader className="mb-2 gap-1">
          <PopoverTitle className="text-xs font-black uppercase tracking-tighter">
            Export report
          </PopoverTitle>
        </PopoverHeader>
        <button
          type="button"
          onClick={handleExcel}
          disabled={exporting}
          className="inline-flex h-9 w-full items-center gap-2 border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] disabled:opacity-50"
        >
          <Download className="size-4" strokeWidth={3} />
          {exporting ? "Generating…" : "Download Excel"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
er>
  );
}
