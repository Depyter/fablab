import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { authQuery } from "../helper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectDoc = Doc<"projects">;
type ResourceUsageDoc = Doc<"resourceUsage">;

interface MonthlyRevenue {
  year: number;
  month: number;
  revenue: number;
  count: number;
}

interface ResourceUtilization {
  resourceId: Id<"resources"> | null;
  name: string;
  totalBookedMinutes: number;
}

interface MaterialUsageMetric {
  materialId: Id<"materials">;
  name: string;
  unit: string;
  totalUsed: number;
  totalCost: number;
  currentStock: number;
}

interface TopServiceMetric {
  serviceId: Id<"services">;
  serviceName: string;
  projectCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function msToMinutes(ms: number): number {
  return Math.round(ms / 60000);
}

function getMonthKey(timestamp: number): { year: number; month: number } {
  const d = new Date(timestamp);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ---------------------------------------------------------------------------
// getReportMetrics
// Aggregates overall metrics for a given date range.
// ---------------------------------------------------------------------------

export const getReportMetrics = authQuery({
  role: ["admin", "maker"],
  args: {
    dateFrom: v.number(),
    dateTo: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    projectCount: number;
    projectCountByStatus: Record<string, number>;
    workshopCount: number;
    totalRevenue: number;
    totalMaterialCost: number;
    resourceUtilization: ResourceUtilization[];
    materialUsage: MaterialUsageMetric[];
    topServices: TopServiceMetric[];
  }> => {
    const { dateFrom, dateTo } = args;

    // ── Collect projects created within the date range ─────────────────────
    // _creationTime is not indexed, so we iterate and filter.
    // For staff-only reporting queries with bounded date ranges this is acceptable.
    const allProjects: ProjectDoc[] = [];
    for await (const project of ctx.db.query("projects").order("desc")) {
      if (project._creationTime < dateFrom) break;
      if (project._creationTime <= dateTo) {
        allProjects.push(project);
      }
    }

    // ── Collect resource usages that ended within the date range ───────────
    // Use the by_endTime index to efficiently scope to the window.
    const usages: ResourceUsageDoc[] = [];
    for await (const usage of ctx.db
      .query("resourceUsage")
      .withIndex("by_endTime", (q) =>
        q.gte("endTime", dateFrom).lt("endTime", dateTo + 1),
      )
      .order("asc")) {
      usages.push(usage);
    }

    // ── Project counts ─────────────────────────────────────────────────────
    const projectCount = allProjects.length;
    const projectCountByStatus: Record<string, number> = {};
    let workshopCount = 0;
    const serviceProjectCount: Map<
      Id<"services">,
      { count: number }
    > = new Map();

    for (const project of allProjects) {
      projectCountByStatus[project.status] =
        (projectCountByStatus[project.status] ?? 0) + 1;

      if (project.type === "WORKSHOP") {
        workshopCount++;
      }

      const entry = serviceProjectCount.get(project.service) ?? { count: 0 };
      entry.count++;
      serviceProjectCount.set(project.service, entry);
    }

    // Resolve service names for top services
    const sortedServices = Array.from(serviceProjectCount.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10);

    const topServices: TopServiceMetric[] = await Promise.all(
      sortedServices.map(async ([serviceId, entry]) => {
        const svc = await ctx.db.get(serviceId);
        return {
          serviceId,
          serviceName: svc?.name ?? "Unknown Service",
          projectCount: entry.count,
        };
      }),
    );

    // ── Revenue ────────────────────────────────────────────────────────────
    let totalRevenue = 0;
    for (const project of allProjects) {
      if (project.status === "paid" && project.totalInvoice?.total) {
        totalRevenue += project.totalInvoice.total;
      }
    }

    // ── Resource utilization ───────────────────────────────────────────────
    const resourceMinutes: Map<
      Id<"resources">,
      { name: string; totalMinutes: number }
    > = new Map();

    for (const usage of usages) {
      if (!usage.resource) continue;

      const existing = resourceMinutes.get(usage.resource);
      if (existing) {
        existing.totalMinutes += msToMinutes(usage.endTime - usage.startTime);
      } else {
        const resource = await ctx.db.get(usage.resource);
        const name = resource?.name ?? usage.snapshot.name;
        resourceMinutes.set(usage.resource, {
          name,
          totalMinutes: msToMinutes(usage.endTime - usage.startTime),
        });
      }
    }

    const resourceUtilization: ResourceUtilization[] = Array.from(
      resourceMinutes.entries(),
    ).map(([resourceId, data]) => ({
      resourceId,
      name: data.name,
      totalBookedMinutes: data.totalMinutes,
    }));

    // ── Material usage ─────────────────────────────────────────────────────
    const materialAgg: Map<
      Id<"materials">,
      { name: string; unit: string; totalUsed: number; totalCost: number }
    > = new Map();

    for (const usage of usages) {
      if (!usage.materialsUsed) continue;
      for (const mu of usage.materialsUsed) {
        const existing = materialAgg.get(mu.materialId);
        if (existing) {
          const amount = mu.amountUsed ?? 0;
          const price =
            mu.snapshot?.costPerUnit ?? mu.snapshot?.pricePerUnit ?? 0;
          existing.totalUsed += amount;
          existing.totalCost += amount * price;
        } else {
          const mat = await ctx.db.get(mu.materialId);
          const amount = mu.amountUsed ?? 0;
          const price =
            mu.snapshot?.costPerUnit ?? mu.snapshot?.pricePerUnit ?? 0;
          materialAgg.set(mu.materialId, {
            name: mat?.name ?? mu.snapshot?.name ?? "Unknown",
            unit: mat?.unit ?? mu.snapshot?.unit ?? "units",
            totalUsed: amount,
            totalCost: amount * price,
          });
        }
      }
    }

    const materialUsage: MaterialUsageMetric[] = await Promise.all(
      Array.from(materialAgg.entries()).map(async ([materialId, data]) => {
        const mat = await ctx.db.get(materialId);
        return {
          materialId,
          name: data.name,
          unit: data.unit,
          totalUsed: data.totalUsed,
          totalCost: data.totalCost,
          currentStock: mat?.currentStock ?? 0,
        };
      }),
    );

    // ── Total material cost from all usages ─────────────────────────────────
    const totalMaterialCost = materialUsage.reduce(
      (sum, m) => sum + m.totalCost,
      0,
    );

    return {
      projectCount,
      projectCountByStatus,
      workshopCount,
      totalRevenue,
      totalMaterialCost,
      resourceUtilization,
      materialUsage,
      topServices,
    };
  },
});

// ---------------------------------------------------------------------------
// getRevenueBreakdown
// Returns revenue broken down by month and by service.
// ---------------------------------------------------------------------------

export const getRevenueBreakdown = authQuery({
  role: ["admin", "maker"],
  args: {
    dateFrom: v.number(),
    dateTo: v.number(),
  },
  handler: async (ctx, args) => {
    const { dateFrom, dateTo } = args;

    // Collect paid projects in the date range
    const paidProjects: ProjectDoc[] = [];
    for await (const project of ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .order("desc")) {
      if (project._creationTime < dateFrom) break;
      if (project._creationTime <= dateTo) {
        paidProjects.push(project);
      }
    }

    const monthlyMap = new Map<string, MonthlyRevenue>();
    const serviceMap = new Map<
      Id<"services">,
      { revenue: number; count: number }
    >();
    const serviceNameCache = new Map<Id<"services">, string>();

    for (const project of paidProjects) {
      const revenue = project.totalInvoice?.total ?? 0;

      // Monthly breakdown
      const { year, month } = getMonthKey(project._creationTime);
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const existingMonth = monthlyMap.get(monthKey) ?? {
        year,
        month,
        revenue: 0,
        count: 0,
      };
      existingMonth.revenue += revenue;
      existingMonth.count++;
      monthlyMap.set(monthKey, existingMonth);

      // By service breakdown
      const svcEntry = serviceMap.get(project.service) ?? {
        revenue: 0,
        count: 0,
      };
      svcEntry.revenue += revenue;
      svcEntry.count++;
      serviceMap.set(project.service, svcEntry);

      // Cache service names
      if (!serviceNameCache.has(project.service)) {
        const svc = await ctx.db.get(project.service);
        serviceNameCache.set(project.service, svc?.name ?? "Unknown Service");
      }
    }

    // Sort monthly by year/month ascending
    const monthly = Array.from(monthlyMap.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );

    const byService = Array.from(serviceMap.entries()).map(
      ([serviceId, data]) => ({
        serviceId,
        serviceName: serviceNameCache.get(serviceId) ?? "Unknown Service",
        revenue: data.revenue,
        count: data.count,
      }),
    );

    return { monthly, byService };
  },
});

// ---------------------------------------------------------------------------
// getResourceDowntime
// Reports downtime minutes per resource based on the `UNDER_MAINTENANCE` status.
// Since there's no dedicated downtime log table, we infer downtime from periods
// where a resource's status was set to UNDER_MAINTENANCE.
// ---------------------------------------------------------------------------

export const getResourceDowntime = authQuery({
  role: ["admin", "maker"],
  args: {
    dateFrom: v.number(),
    dateTo: v.number(),
  },
  handler: async (ctx, args) => {
    const { dateFrom, dateTo } = args;

    // Collect all resources
    const resources = await ctx.db.query("resources").collect();

    // For each resource, check its current status.
    // In the MVP, we report the current status and estimate downtime.
    // If a resource is UNDER_MAINTENANCE, we report the full range as downtime.
    const downtime = await Promise.all(
      resources.map(async (resource) => {
        const isDown = resource.status === "Under Maintenance";

        // Count how many bookings (resourceUsage) this resource had in the range
        const usageCount = await ctx.db
          .query("resourceUsage")
          .withIndex("by_resource_startTime", (q) =>
            q.eq("resource", resource._id),
          )
          .filter((q) =>
            q.and(
              q.gte(q.field("startTime"), dateFrom),
              q.lte(q.field("startTime"), dateTo),
            ),
          )
          .collect()
          .then((usages) => usages.length);

        return {
          resourceId: resource._id,
          name: resource.name,
          category: resource.category,
          currentStatus: resource.status,
          isUnderMaintenance: isDown,
          // When UNDER_MAINTENANCE, estimate downtime as full range.
          // This is a rough estimate until a dedicated downtime log exists.
          totalDowntimeMinutes: isDown ? msToMinutes(dateTo - dateFrom) : 0,
          bookingCount: usageCount,
        };
      }),
    );

    return downtime;
  },
});
