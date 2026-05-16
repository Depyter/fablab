"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useProfile } from "@/components/sidebar/profile-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataViewSearchField } from "@/components/manage/data-view-toolbar";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import {
  WorkshopEventCard,
  type WorkshopEvent,
} from "@/components/workshops/workshop-event-card";
import { ProjectDetails } from "@/components/projects/project-details";
import { Search, Calendar, FolderOpen } from "lucide-react";

const STATUS_FILTERS = ["upcoming", "past", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function WorkshopsFilterBar() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const status = getSearchParam(searchParams, "status", "upcoming");
  const search = getSearchParam(searchParams, "search");
  const { pathname } = useDataViewRouteState();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40"
          strokeWidth={3}
        />
        <DataViewSearchField
          key={`${pathname}:${search}`}
          search={search}
          onSearchChange={(value) =>
            replaceParams({ search: value ? value : null })
          }
          placeholder="Search workshops…"
          className="w-full border-2 border-black pl-10 text-sm font-bold"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) =>
            replaceParams({ status: value === "upcoming" ? null : value })
          }
        >
          <SelectTrigger className="h-10 min-w-36 border-2 border-black bg-white text-sm font-black uppercase tracking-tighter shadow-[3px_3px_0_0_#000]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-2 border-black shadow-[4px_4px_0_0_#000]">
            <SelectItem value="upcoming" className="font-bold">
              Upcoming
            </SelectItem>
            <SelectItem value="past" className="font-bold">
              Past
            </SelectItem>
            <SelectItem value="all" className="font-bold">
              All
            </SelectItem>
          </SelectContent>
        </Select>

        {status !== "upcoming" && (
          <button
            type="button"
            onClick={() =>
              replaceParams({ status: null, service: null, startTime: null })
            }
            className="inline-flex items-center border-2 border-black bg-fab-amber px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black shadow-[3px_3px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkshopsPage() {
  const { searchParams } = useDataViewRouteState();
  const profile = useProfile();
  const isClient = profile?.role === "client";
  const statusRaw = getSearchParam(searchParams, "status", "upcoming");
  const serviceIdRaw = getSearchParam(searchParams, "service") || undefined;
  const startTimeRaw = getSearchParam(searchParams, "startTime") || undefined;
  const search = getSearchParam(searchParams, "search");

  const status: StatusFilter = STATUS_FILTERS.includes(
    statusRaw as StatusFilter,
  )
    ? (statusRaw as StatusFilter)
    : "upcoming";

  const startTime = startTimeRaw ? Number(startTimeRaw) : undefined;

  const serviceId = serviceIdRaw as Id<"services"> | undefined;

  const result = useQuery(api.projects.query.getWorkshopEvents, {
    status,
    serviceId,
    startTime: startTime && !Number.isNaN(startTime) ? startTime : undefined,
  });

  const rawUpcoming: WorkshopEvent[] = (result?.upcoming ??
    []) as WorkshopEvent[];
  const rawPast: WorkshopEvent[] = (result?.past ?? []) as WorkshopEvent[];

  // Filter by search
  const upcoming = React.useMemo(() => {
    if (!search.trim()) return rawUpcoming;
    const q = search.toLowerCase();
    return rawUpcoming.filter(
      (e) =>
        e.serviceName.toLowerCase().includes(q) ||
        e.attendees.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [rawUpcoming, search]);

  const past = React.useMemo(() => {
    if (!search.trim()) return rawPast;
    const q = search.toLowerCase();
    return rawPast.filter(
      (e) =>
        e.serviceName.toLowerCase().includes(q) ||
        e.attendees.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [rawPast, search]);

  const isLoading = result === undefined;

  const hasResults = upcoming.length > 0 || past.length > 0;

  const [selectedProjectId, setSelectedProjectId] =
    useState<Id<"projects"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleOpenProjectDetails = React.useCallback((projectId: string) => {
    setSelectedProjectId(projectId as Id<"projects">);
    setIsDetailsOpen(true);
  }, []);

  const handleDetailsOpenChange = React.useCallback((open: boolean) => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedProjectId(null);
    }
  }, []);

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-20" />

      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Filter bar */}
        {!isClient && (
          <div className="border-b-4 border-black bg-fab-amber/20 px-6 py-4">
            <div className="mx-auto max-w-4xl">
              <WorkshopsFilterBar />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative">
          <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="h-28 animate-pulse border-4 border-black bg-black/5 shadow-[6px_6px_0_0_#000]"
                  />
                ))}
              </div>
            ) : !hasResults ? (
              <div className="flex flex-col items-center justify-center border-4 border-black bg-white px-6 py-20 text-center shadow-[8px_8px_0_0_#000]">
                <FolderOpen
                  className="mb-4 h-16 w-16 text-black/30"
                  strokeWidth={1.5}
                />
                <h3 className="text-2xl font-black uppercase tracking-tighter text-black">
                  No workshops found
                </h3>
                <p className="mt-2 max-w-md text-sm font-bold text-black/60">
                  {search.trim()
                    ? "Try adjusting your search or filters."
                    : "There are no workshop events to display."}
                </p>
              </div>
            ) : (
              <>
                {/* Upcoming section */}
                {upcoming.length > 0 && (
                  <section>
                    <div className="mb-4 inline-flex items-center gap-3 border-4 border-black bg-fab-amber px-5 py-2.5 shadow-[5px_5px_0_0_#000]">
                      <Calendar
                        className="h-5 w-5 text-black"
                        strokeWidth={3}
                      />
                      <h2 className="text-lg font-black uppercase tracking-tighter text-black">
                        Upcoming
                      </h2>
                      <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-black bg-white text-xs font-black text-black">
                        {upcoming.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {upcoming.map((event) => (
                        <WorkshopEventCard
                          key={`${event.serviceId}-${event.startTime}`}
                          event={event}
                          readOnly={isClient}
                          highlight={
                            serviceId === event.serviceId &&
                            startTime === event.startTime
                          }
                          onOpenProjectDetails={handleOpenProjectDetails}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Past section */}
                {past.length > 0 && (
                  <section>
                    <div className="mb-4 inline-flex items-center gap-3 border-4 border-black bg-white px-5 py-2.5 shadow-[5px_5px_0_0_#000]">
                      <Calendar
                        className="h-5 w-5 text-black/50"
                        strokeWidth={3}
                      />
                      <h2 className="text-lg font-black uppercase tracking-tighter text-black/60">
                        Past
                      </h2>
                      <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-black bg-black/5 text-xs font-black text-black/60">
                        {past.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {past.map((event) => (
                        <WorkshopEventCard
                          key={`${event.serviceId}-${event.startTime}`}
                          event={event}
                          readOnly
                          onOpenProjectDetails={handleOpenProjectDetails}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ProjectDetails
        projectId={selectedProjectId}
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        hideTrigger
      />
    </div>
  );
}
