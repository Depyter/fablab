"use client";

import * as React from "react";
import { PackageOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DataViewRoot,
  DataViewToolbar,
  DataViewFilters,
  DataViewContent,
  DataViewLoadMore,
} from "@/components/manage/data-view";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectCalendarView } from "@/components/projects/project-calendar-view";
import { ProjectDetails } from "@/components/projects/project-details";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { isToday, isThisWeek, isThisMonth } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "completed";
type DateFilter = "all" | "today" | "week" | "month";
type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "name-az";

type EnrichedProject = {
  _id: Id<"projects">;
  name: string;
  description: string;
  clientName: string;
  serviceName: string;
  bookingDate: number | null;
  bookingStartTime: number | null;
  bookingEndTime: number | null;
  estimatedPrice: number;
  status: string;
  coverUrl?: string | null;
};

// ---------------------------------------------------------------------------
// Status styling helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-blue-400",
  rejected: "bg-red-400",
  completed: "bg-emerald-400",
};

// ---------------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------------

function ProjectListRow({ project }: { project: EnrichedProject }) {
  return (
    <ProjectDetails
      key={project._id}
      projectId={project._id}
      trigger={
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
          {/* Thumbnail */}
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
                  project.status === "rejected" && "bg-red-500/20",
                  project.status === "completed" && "bg-emerald-500/20",
                )}
              />
            )}
          </div>

          <div className="flex flex-1 items-center justify-between min-w-0 gap-3">
            {/* Project info */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-sm truncate">
                {project.name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {project.serviceName} · {project.clientName}
              </span>
            </div>

            {/* Right-side meta */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground hidden md:block whitespace-nowrap">
                {project.bookingDate
                  ? new Date(project.bookingDate).toLocaleDateString([], {
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
                  STATUS_STYLES[project.status] ??
                    "bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    STATUS_DOT[project.status] ?? "bg-muted-foreground",
                  )}
                />
                {project.status}
              </span>
            </div>
          </div>
        </div>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectsList() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("newest");

  const {
    results: rawResults,
    status: queryStatus,
    loadMore,
  } = usePaginatedQuery(
    api.projects.query.getProjects,
    {},
    { initialNumItems: 24 },
  );

  const projects = React.useMemo(
    () => (rawResults || []) as EnrichedProject[],
    [rawResults],
  );
  const isLoading = queryStatus === "LoadingFirstPage";

  const activeFilterCount = [
    search.trim() !== "",
    statusFilter !== "all",
    dateFilter !== "all",
    sortBy !== "newest",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setSortBy("newest");
  };

  const filteredProjects = React.useMemo(() => {
    let result = [...projects];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.serviceName.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (dateFilter !== "all") {
      result = result.filter((p) => {
        if (!p.bookingDate) return false;
        const d = new Date(p.bookingDate);
        if (dateFilter === "today") return isToday(d);
        if (dateFilter === "week") return isThisWeek(d, { weekStartsOn: 1 });
        if (dateFilter === "month") return isThisMonth(d);
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "newest")
        return (b.bookingDate ?? 0) - (a.bookingDate ?? 0);
      if (sortBy === "oldest")
        return (a.bookingDate ?? 0) - (b.bookingDate ?? 0);
      if (sortBy === "price-high") return b.estimatedPrice - a.estimatedPrice;
      if (sortBy === "price-low") return a.estimatedPrice - b.estimatedPrice;
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [projects, search, statusFilter, dateFilter, sortBy]);

  return (
    <DataViewRoot defaultView="gallery">
      <DataViewToolbar
        title="Your Projects"
        subtitle={
          !isLoading
            ? filteredProjects.length === projects.length
              ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
              : `${filteredProjects.length} of ${projects.length} projects`
            : undefined
        }
        views={["calendar", "gallery", "list"]}
        actions={
          <Button size="sm" className="h-8 gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Project</span>
          </Button>
        }
      />

      <DataViewFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects…"
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        hideInViews={["calendar"]}
      >
        {/* Status */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-7 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All statuses
            </SelectItem>
            <SelectItem value="pending" className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                Pending
              </span>
            </SelectItem>
            <SelectItem value="approved" className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                Approved
              </span>
            </SelectItem>
            <SelectItem value="rejected" className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
                Rejected
              </span>
            </SelectItem>
            <SelectItem value="completed" className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                Completed
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Date */}
        <Select
          value={dateFilter}
          onValueChange={(v) => setDateFilter(v as DateFilter)}
        >
          <SelectTrigger className="h-7 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All dates
            </SelectItem>
            <SelectItem value="today" className="text-xs">
              Today
            </SelectItem>
            <SelectItem value="week" className="text-xs">
              This week
            </SelectItem>
            <SelectItem value="month" className="text-xs">
              This month
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="h-7 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest" className="text-xs">
              Newest first
            </SelectItem>
            <SelectItem value="oldest" className="text-xs">
              Oldest first
            </SelectItem>
            <SelectItem value="price-high" className="text-xs">
              Price: high → low
            </SelectItem>
            <SelectItem value="price-low" className="text-xs">
              Price: low → high
            </SelectItem>
            <SelectItem value="name-az" className="text-xs">
              Name A → Z
            </SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilters>

      <DataViewContent
        items={filteredProjects}
        totalItems={projects.length}
        isLoading={isLoading}
        viewSlots={{ calendar: <ProjectCalendarView /> }}
        renderItem={(project) => (
          <ProjectCard
            key={project._id}
            projectId={project._id}
            title={project.name}
            description={project.description}
            clientName={project.clientName}
            serviceName={project.serviceName}
            bookingDate={project.bookingDate}
            bookingStartTime={project.bookingStartTime}
            bookingEndTime={project.bookingEndTime}
            estimatedPrice={project.estimatedPrice}
            status={project.status}
            coverUrl={project.coverUrl ?? null}
          />
        )}
        renderListItem={(project) => (
          <ProjectListRow key={project._id} project={project} />
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
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ),
        }}
      />

      <DataViewLoadMore
        canLoadMore={queryStatus === "CanLoadMore"}
        onLoadMore={() => loadMore(12)}
        hideInViews={["calendar"]}
      />
    </DataViewRoot>
  );
}
