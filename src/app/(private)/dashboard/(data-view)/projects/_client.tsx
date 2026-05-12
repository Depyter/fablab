"use client";

import * as React from "react";
import { PackageOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DataViewContent,
  DataViewLoadMore,
} from "@/components/manage/data-view";
import {
  getProjectsView,
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDetails } from "@/components/projects/project-details";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PROJECT_STATUS_LABELS } from "@convex/constants";
import posthog from "posthog-js";

type StatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "completed"
  | "paid"
  | "claimed"
  | "rejected"
  | "cancelled";
type DateFilter = "all" | "today" | "week" | "month";
type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "name-az";

type EnrichedProject = {
  _id: Id<"projects">;
  name: string;
  description: string;
  clientName: string;
  serviceName: string;
  usageCount: number;
  bookingStartTime: number | null;
  bookingEndTime: number | null;
  estimatedPrice: number;
  status: string;
  coverUrl?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  paid: "bg-teal-100 text-teal-700",
  claimed: "bg-slate-100 text-slate-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-blue-400",
  completed: "bg-emerald-400",
  paid: "bg-teal-400",
  claimed: "bg-slate-400",
  rejected: "bg-red-400",
  cancelled: "bg-red-400",
};

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "pending",
  "approved",
  "completed",
  "paid",
  "claimed",
  "rejected",
  "cancelled",
];
const DATE_FILTERS: DateFilter[] = ["all", "today", "week", "month"];
const SORT_OPTIONS: SortOption[] = [
  "newest",
  "oldest",
  "price-high",
  "price-low",
  "name-az",
];

function ProjectListRow({
  project,
  onOpenDetails,
}: {
  project: EnrichedProject;
  onOpenDetails: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpenDetails}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="h-10 w-14 rounded-md overflow-hidden shrink-0 bg-muted">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full",
              project.status === "pending" && "bg-amber-500/20",
              project.status === "approved" && "bg-blue-500/20",
              project.status === "completed" && "bg-emerald-500/20",
              project.status === "paid" && "bg-teal-500/20",
              project.status === "claimed" && "bg-slate-500/20",
              project.status === "rejected" && "bg-red-500/20",
              project.status === "cancelled" && "bg-red-500/20",
            )}
          />
        )}
      </div>

      <div className="flex flex-1 items-center justify-between min-w-0 gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-sm truncate">{project.name}</span>
          <span className="text-xs text-muted-foreground truncate">
            {project.serviceName} · {project.clientName} · {project.usageCount}{" "}
            {project.usageCount === 1 ? "usage" : "usages"}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden md:block whitespace-nowrap">
            {project.bookingStartTime
              ? new Date(project.bookingStartTime).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </span>
          <span className="text-sm font-semibold whitespace-nowrap hidden sm:block">
            ₱{project.estimatedPrice.toFixed(2)}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap",
              STATUS_STYLES[project.status] ?? "bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                STATUS_DOT[project.status] ?? "bg-muted-foreground",
              )}
            />
            {PROJECT_STATUS_LABELS[
              project.status as keyof typeof PROJECT_STATUS_LABELS
            ] ?? project.status}
          </span>
        </div>
      </div>
    </button>
  );
}

export function ProjectsListClient() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const search = getSearchParam(searchParams, "search");
  const statusRaw = getSearchParam(searchParams, "status", "all");
  const dateRaw = getSearchParam(searchParams, "date", "all");
  const sortRaw = getSearchParam(searchParams, "sort", "newest");
  const view = getProjectsView(searchParams);
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<Id<"projects"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const handleOpenProjectDetails = React.useCallback(
    (projectId: Id<"projects">) => {
      setSelectedProjectId(projectId);
      setIsDetailsOpen(true);
    },
    [],
  );

  const handleDetailsOpenChange = React.useCallback((open: boolean) => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedProjectId(null);
    }
  }, []);

  const statusFilter: StatusFilter = STATUS_FILTERS.includes(
    statusRaw as StatusFilter,
  )
    ? (statusRaw as StatusFilter)
    : "all";
  const dateFilter: DateFilter = DATE_FILTERS.includes(dateRaw as DateFilter)
    ? (dateRaw as DateFilter)
    : "all";
  const sortBy: SortOption = SORT_OPTIONS.includes(sortRaw as SortOption)
    ? (sortRaw as SortOption)
    : "newest";

  const isSearching = search.trim() !== "";

  React.useEffect(() => {
    posthog.capture("project_list_viewed");
  }, []);

  const {
    results: rawResults,
    status: queryStatus,
    loadMore,
  } = usePaginatedQuery(
    api.projects.query.getProjects,
    {
      statusFilter,
      dateFilter: isSearching ? "all" : dateFilter,
      sortBy: isSearching ? "newest" : sortBy,
      searchText: search.trim() || undefined,
    },
    { initialNumItems: 24 },
  );

  const projects = React.useMemo(
    () => (rawResults || []) as EnrichedProject[],
    [rawResults],
  );
  const isLoading = queryStatus === "LoadingFirstPage";

  return (
    <>
      <DataViewContent
        view={view}
        items={projects}
        totalItems={projects.length}
        isLoading={isLoading}
        renderItem={(project) => (
          <ProjectCard
            key={project._id}
            title={project.name}
            description={project.description}
            clientName={project.clientName}
            serviceName={project.serviceName}
            usageCount={project.usageCount}
            bookingDate={project.bookingStartTime}
            bookingStartTime={project.bookingStartTime}
            bookingEndTime={project.bookingEndTime}
            estimatedPrice={project.estimatedPrice}
            status={project.status}
            coverUrl={project.coverUrl ?? null}
            onOpenDetails={() => handleOpenProjectDetails(project._id)}
          />
        )}
        renderListItem={(project) => (
          <ProjectListRow
            key={project._id}
            project={project}
            onOpenDetails={() => handleOpenProjectDetails(project._id)}
          />
        )}
        emptyState={{
          icon: <PackageOpen className="size-12" />,
          title: "No projects found",
          description:
            "The catalogue is empty. No clients have created projects or booking requests yet.",
        }}
        filteredEmptyState={{
          icon: <Search className="size-8" />,
          title: "No matching projects",
          description: "Try adjusting your filters.",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                replaceParams({
                  search: null,
                  status: null,
                  date: null,
                  sort: null,
                })
              }
            >
              Clear filters
            </Button>
          ),
        }}
      />

      <ProjectDetails
        projectId={selectedProjectId}
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        hideTrigger
      />

      <DataViewLoadMore
        view={view}
        canLoadMore={queryStatus === "CanLoadMore"}
        onLoadMore={() => loadMore(12)}
      />
    </>
  );
}
