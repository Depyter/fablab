"use client";

import {
  PackageOpen,
  Plus,
  Search,
  Calendar,
  LayoutGrid,
  List,
} from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectCalendarView } from "@/components/projects/project-calendar-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as React from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";

type ViewMode = "gallery" | "list" | "calendar";

export default function ProjectsList() {
  const [view, setView] = React.useState<ViewMode>("gallery");

  const {
    results,
    status: queryStatus,
    loadMore,
  } = usePaginatedQuery(
    api.projects.query.getProjects,
    {},
    { initialNumItems: 12 },
  );

  const projects = results || [];
  const isLoading = queryStatus === "LoadingFirstPage";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Projects</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Loading projects..."
              : projects.length === 0
                ? "No projects yet — add one to get started."
                : `Total projects: ${projects.length}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-full max-w-50">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-full h-9"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center border rounded-md overflow-hidden h-9">
            <Button
              variant="ghost"
              size="sm"
              title="Calendar View"
              onClick={() => setView("calendar")}
              className={cn(
                "h-9 w-9 rounded-none border-r px-0",
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
                "h-9 w-9 rounded-none border-r px-0",
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
                "h-9 w-9 rounded-none px-0",
                view === "list" && "bg-muted text-foreground",
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Add Project */}
          <Button size="sm" className="gap-1 h-9">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      </div>

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
      ) : view === "gallery" ? (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
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
              />
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="p-6">
          <div className="border rounded-lg divide-y bg-background">
            {projects.map((project) => (
              <div
                key={project._id}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-sm truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {project.serviceName} · {project.clientName}
                  </span>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(project.bookingDate).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium">
                    ₱{project.estimatedPrice.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full capitalize",
                      project.status === "rejected" &&
                        "bg-green-100 text-green-700",
                      project.status === "approved" &&
                        "bg-blue-100 text-blue-700",
                      project.status === "pending" &&
                        "bg-yellow-100 text-yellow-700",
                    )}
                  >
                    {project.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {queryStatus === "CanLoadMore" && (
        <div className="flex justify-center p-6">
          <Button variant="outline" onClick={() => loadMore(12)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
