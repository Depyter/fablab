"use client";

import {
  PackageOpen,
  Plus,
  Calendar,
  LayoutGrid,
  List,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectCalendarView } from "@/components/projects/project-calendar-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import * as React from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { isToday, isThisWeek, isThisMonth } from "date-fns";

type ViewMode = "gallery" | "list" | "calendar";
type StatusFilter = "all" | "pending" | "approved" | "rejected" | "completed";
type DateFilter = "all" | "today" | "week" | "month";
type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "name-az";

type EnrichedProject = {
  _id: string;
  name: string;
  description: string;
  clientName: string;
  serviceName: string;
  bookingDate: number;
  bookingTime?: number;
  estimatedPrice: number;
  status: string;
  coverUrl?: string | null;
};

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

export default function ProjectsList() {
  const [view, setView] = React.useState<ViewMode>("gallery");
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

  const projects = (rawResults || []) as EnrichedProject[];
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

  const filteredProjects = (() => {
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
        const d = new Date(p.bookingDate);
        if (dateFilter === "today") return isToday(d);
        if (dateFilter === "week") return isThisWeek(d, { weekStartsOn: 1 });
        if (dateFilter === "month") return isThisMonth(d);
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return b.bookingDate - a.bookingDate;
      if (sortBy === "oldest") return a.bookingDate - b.bookingDate;
      if (sortBy === "price-high") return b.estimatedPrice - a.estimatedPrice;
      if (sortBy === "price-low") return a.estimatedPrice - b.estimatedPrice;
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  })();

  const showFilterBar = view !== "calendar" && !isLoading;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — single row at all widths */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight truncate">
            Your Projects
          </h1>
          {!isLoading && view !== "calendar" && (
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              {filteredProjects.length === projects.length
                ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
                : `${filteredProjects.length} of ${projects.length} projects`}
            </p>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center border rounded-md overflow-hidden h-8 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            title="Calendar View"
            onClick={() => setView("calendar")}
            className={cn(
              "h-8 w-8 rounded-none border-r px-0",
              view === "calendar" && "bg-muted text-foreground",
            )}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Gallery View"
            onClick={() => setView("gallery")}
            className={cn(
              "h-8 w-8 rounded-none border-r px-0",
              view === "gallery" && "bg-muted text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="List View"
            onClick={() => setView("list")}
            className={cn(
              "h-8 w-8 rounded-none px-0",
              view === "list" && "bg-muted text-foreground",
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button size="sm" className="h-8 gap-1 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Project</span>
        </Button>
      </div>

      {/* Filter bar */}
      {showFilterBar && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20 shrink-0 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 hidden sm:block" />

          {/* Search */}
          <div className="relative flex-1 min-w-36 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs bg-background border-border/60 shadow-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

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

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs text-muted-foreground gap-1 hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {view === "calendar" ? (
        <ProjectCalendarView />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 flex-1 text-muted-foreground">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-8 py-16 flex-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-6">
              <PackageOpen className="size-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No projects found</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              The catalogue is empty. No clients have created projects or
              booking requests yet.
            </p>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 flex-1">
          <div className="rounded-full bg-muted p-5">
            <Search className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold">No matching projects</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Try adjusting your filters.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : view === "gallery" ? (
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                title={project.name}
                description={project.description}
                clientName={project.clientName}
                serviceName={project.serviceName}
                bookingDate={project.bookingDate}
                estimatedPrice={project.estimatedPrice}
                status={project.status}
                bookingTime={project.bookingTime}
                coverUrl={project.coverUrl ?? null}
              />
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="border rounded-lg divide-y bg-background overflow-hidden">
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
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
                      {new Date(project.bookingDate).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap hidden sm:block">
                      ₱{project.estimatedPrice.toFixed(2)}
                    </span>

                    {/* Status pill — always visible */}
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
            ))}
          </div>
        </div>
      )}

      {queryStatus === "CanLoadMore" && view !== "calendar" && (
        <div className="flex justify-center p-6">
          <Button variant="outline" onClick={() => loadMore(12)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
