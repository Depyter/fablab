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
import {
  DataViewFilterField,
  DataViewFilterPanel,
  DataViewSearchField,
} from "@/components/manage/data-view-toolbar";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import { ViewHeaderMain } from "@/components/ui/view-header";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import {
  WorkshopEventCard,
  type WorkshopEvent,
} from "@/components/workshops/workshop-event-card";
import { ProjectDetails } from "@/components/projects/project-details";
import { Calendar, PackageOpen } from "lucide-react";

const STATUS_FILTERS = ["upcoming", "past", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function WorkshopFilterControls() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const status = getSearchParam(searchParams, "status", "upcoming");
  const activeFilterCount = status !== "upcoming" ? 1 : 0;

  return (
    <DataViewFilterPanel
      activeCount={activeFilterCount}
      title="Workshop filters"
      onClear={() =>
        replaceParams({
          status: null,
          service: null,
          startTime: null,
        })
      }
    >
      <DataViewFilterField label="Status">
        <Select
          value={status}
          onValueChange={(value) =>
            replaceParams({ status: value === "upcoming" ? null : value })
          }
        >
          <SelectTrigger className="h-9 w-full bg-background text-sm shadow-none">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilterField>
    </DataViewFilterPanel>
  );
}

function WorkshopsPageHeader() {
  const { pathname, searchParams, replaceParams } = useDataViewRouteState();
  const search = getSearchParam(searchParams, "search");

  return (
    <DataViewPageHeader>
      <ViewHeaderMain>
        <DataViewSearchField
          key={`${pathname}:${search}`}
          search={search}
          onSearchChange={(value) =>
            replaceParams({ search: value ? value : null })
          }
          placeholder="Search workshops…"
          className="max-w-sm"
        />
        <div className="flex shrink-0 items-center gap-2">
          <WorkshopFilterControls />
        </div>
      </ViewHeaderMain>
    </DataViewPageHeader>
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      {!isClient && <WorkshopsPageHeader />}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-28 animate-pulse rounded-xl bg-amber-50/50"
                />
              ))}
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <PackageOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                No workshops found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70">
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
                  <div className="mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-amber-900">
                      Upcoming ({upcoming.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
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
                  <div className="mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground/60" />
                    <h2 className="text-lg font-bold text-muted-foreground/80">
                      Past ({past.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
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

      <ProjectDetails
        projectId={selectedProjectId}
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        hideTrigger
      />
    </div>
  );
}
