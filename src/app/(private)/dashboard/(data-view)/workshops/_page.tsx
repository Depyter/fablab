"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useProfile } from "@/components/sidebar/profile-context";
import { SelectItem } from "@/components/ui/select";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import {
  WorkshopEventCard,
  type WorkshopEvent,
} from "@/components/workshops/workshop-event-card";
import { AddWorkshopSlotDialog } from "@/components/workshops/add-workshop-slot-dialog";
import { ProjectDetails } from "@/components/projects/project-details";
import { Calendar, FolderOpen } from "lucide-react";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import {
  GridBackground,
  SectionBadge,
  BrandSkeleton,
  BrandCard,
  BrandSelect,
  BrandFilterPanel,
  BrandSearchField,
} from "@/components/brand/primitives";

const STATUS_FILTERS = ["upcoming", "past", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function WorkshopsFilterBar() {
  const { searchParams, replaceParams, pathname } = useDataViewRouteState();
  const status = getSearchParam(searchParams, "status", "upcoming");
  const search = getSearchParam(searchParams, "search");
  const activeFilterCount = status !== "upcoming" ? 1 : 0;

  return (
    <>
      <BrandSearchField
        value={search}
        onChange={(value) => replaceParams({ search: value ? value : null })}
        placeholder="Search workshops…"
        remountKey={`${pathname}:${search}`}
      />

      <BrandFilterPanel
        title="Workshop filters"
        activeCount={activeFilterCount}
        onClear={() =>
          replaceParams({ status: null, service: null, startTime: null })
        }
      >
        <BrandSelect
          value={status}
          onValueChange={(value) =>
            replaceParams({ status: value === "upcoming" ? null : value })
          }
          placeholder="Status"
        >
          <SelectItem value="upcoming" className="font-bold">
            Upcoming
          </SelectItem>
          <SelectItem value="past" className="font-bold">
            Past
          </SelectItem>
          <SelectItem value="all" className="font-bold">
            All
          </SelectItem>
        </BrandSelect>
      </BrandFilterPanel>
    </>
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
      <GridBackground />

      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Filter bar */}
        {!isClient && (
          <DataViewPageHeader>
            <WorkshopsFilterBar />
            <AddWorkshopSlotDialog />
          </DataViewPageHeader>
        )}

        {/* Content */}
        <div className="relative">
          <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BrandSkeleton key={`skeleton-${i}`} className="h-28" />
                ))}
              </div>
            ) : !hasResults ? (
              <BrandCard className="px-6 py-20 text-center shadow-[8px_8px_0_0_#000]">
                <div className="flex flex-col items-center justify-center">
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
              </BrandCard>
            ) : (
              <>
                {/* Upcoming section */}
                {upcoming.length > 0 && (
                  <section>
                    <SectionBadge
                      icon={<Calendar className="h-5 w-5" strokeWidth={3} />}
                      title="Upcoming"
                      count={upcoming.length}
                      variant="amber"
                    />
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
                    <SectionBadge
                      icon={<Calendar className="h-5 w-5" strokeWidth={3} />}
                      title="Past"
                      count={past.length}
                      variant="muted"
                    />
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
