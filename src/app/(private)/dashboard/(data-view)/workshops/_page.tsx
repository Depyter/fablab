"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useProfile } from "@/components/sidebar/profile-context";
import { AddSessionDialog } from "@/components/workshops/add-session-dialog";
import {
  BrandSkeleton,
  BrandCard,
  CapacityBar,
  GridBackground,
} from "@/components/brand/primitives";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import { formatLabDate, formatLabTime } from "@/lib/lab-time";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit,
  Calendar,
  Clock,
  Users,
  FolderOpen,
  PackageOpen,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "upcoming" | "all";

/** Session returned by listUpcoming / listPast with attached service info */
type SessionWithService = {
  _id: string;
  serviceId: string;
  date: number;
  startTime: number;
  endTime: number;
  maxSlots: number;
  usedUpSlots: number;
  status: string;
  resources?: string[];
  availableMaterials?: string[];
  serviceName: string;
  serviceSlug: string;
};

// ---------------------------------------------------------------------------
// Chips — colored abbreviation badges for workshop services
// ---------------------------------------------------------------------------

const CHIP_COLORS = [
  { bg: "bg-fab-teal/15", text: "text-fab-teal", ring: "ring-fab-teal/40" },
  { bg: "bg-fab-amber/15", text: "text-fab-amber", ring: "ring-fab-amber/40" },
  {
    bg: "bg-fab-magenta/15",
    text: "text-fab-magenta",
    ring: "ring-fab-magenta/40",
  },
  { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-300" },
  { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-300" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-300" },
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-300" },
  { bg: "bg-cyan-100", text: "text-cyan-700", ring: "ring-cyan-300" },
];

function getServiceColorIndex(serviceId: string) {
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash * 31 + serviceId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % CHIP_COLORS.length;
}

function getAbbreviation(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  // Single word — take first 2-3 characters
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, Math.min(3, cleaned.length));
}

function ServiceChip({
  serviceId,
  serviceName,
}: {
  serviceId: string;
  serviceName: string;
}) {
  const color = CHIP_COLORS[getServiceColorIndex(serviceId)];
  const abbr = getAbbreviation(serviceName);
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black text-[10px] font-black uppercase leading-none ring-1",
        color.bg,
        color.text,
        color.ring,
      )}
      title={serviceName}
    >
      {abbr}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Session Row (used in "Upcoming" tab)
// ---------------------------------------------------------------------------

function SessionRow({
  session,
  readOnly,
  variant = "upcoming",
}: {
  session: SessionWithService;
  readOnly?: boolean;
  variant?: "upcoming" | "past";
}) {
  return (
    <Link
      href={readOnly ? "#" : `/dashboard/workshops/${session.serviceSlug}/edit`}
      className={cn(
        "group block border-4 border-black bg-white shadow-[6px_6px_0_0_#000] transition-all",
        !readOnly &&
          "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000]",
      )}
    >
      <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
        {/* Chip */}
        <ServiceChip
          serviceId={session.serviceId}
          serviceName={session.serviceName}
        />

        {/* Session info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black uppercase tracking-tighter text-black">
            {session.serviceName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-black/60">
            <span className="inline-flex items-center gap-1">
              <Calendar
                className="h-3.5 w-3.5 text-fab-amber"
                strokeWidth={2.5}
              />
              {formatLabDate(session.date, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-fab-teal" strokeWidth={2.5} />
              {formatLabTime(session.startTime)} –{" "}
              {formatLabTime(session.endTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users
                className="h-3.5 w-3.5 text-fab-magenta"
                strokeWidth={2.5}
              />
              {session.usedUpSlots}/{session.maxSlots} slots used
            </span>
          </div>
        </div>

        {/* Capacity bar / Completed */}
        {variant === "past" ? (
          <div className="hidden shrink-0 sm:block">
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-black/40">
              Completed
            </span>
          </div>
        ) : (
          <>
            <div className="hidden w-36 shrink-0 sm:block">
              <CapacityBar
                usedSlots={session.usedUpSlots}
                maxSlots={session.maxSlots}
              />
            </div>
            {/* Edit arrow */}
            {!readOnly && (
              <div className="shrink-0 text-black/30 transition-all group-hover:text-black">
                <Edit className="h-4 w-4" strokeWidth={3} />
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Workshop Card (used in "All workshops" tab)
// ---------------------------------------------------------------------------

function WorkshopCard({
  service,
  sessions,
  readOnly,
  onAddSession,
}: {
  service: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    imageUrls: string[];
  };
  sessions: SessionWithService[];
  readOnly?: boolean;
  onAddSession: (serviceId: string) => void;
}) {
  const upcomingSessions = useMemo(
    () => sessions.filter((s) => s.status !== "cancelled").slice(0, 2),
    [sessions],
  );

  const { upcomingCount, totalCount } = useMemo(() => {
    const now = Date.now();
    return {
      upcomingCount: sessions.filter(
        (s) => s.status !== "cancelled" && s.date >= now,
      ).length,
      totalCount: sessions.length,
    };
  }, [sessions]);

  return (
    <BrandCard className="flex flex-col">
      {/* Cover */}
      <Link href={`/dashboard/workshops/${service.slug}/edit`}>
        <div className="relative h-36 w-full overflow-hidden bg-black/5">
          {service.imageUrls[0] ? (
            <img
              src={service.imageUrls[0]}
              alt={service.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-fab-amber/10">
              <PackageOpen
                className="h-10 w-10 text-black/20"
                strokeWidth={1.5}
              />
            </div>
          )}
          {/* Edit badge */}
          {!readOnly && (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000]">
              <Edit className="h-2.5 w-2.5" strokeWidth={3} />
              Edit
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/dashboard/workshops/${service.slug}/edit`}
          className="group"
        >
          <h3 className="text-base font-black uppercase tracking-tighter text-black transition-colors group-hover:text-fab-teal">
            {service.name}
          </h3>
        </Link>
        {service.description && (
          <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-relaxed text-black/60">
            {service.description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border-2 border-black bg-fab-teal/10 px-2 py-1.5 text-center">
            <p className="text-sm font-black leading-none text-black">
              {upcomingCount}
            </p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-black/50">
              Upcoming
            </p>
          </div>
          <div className="border-2 border-black bg-fab-amber/10 px-2 py-1.5 text-center">
            <p className="text-sm font-black leading-none text-black">
              {totalCount}
            </p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-black/50">
              Total
            </p>
          </div>
        </div>

        {/* Session strip */}
        <div className="mt-3 border-t-4 border-black pt-3">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-black/40">
            Upcoming sessions
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((s) => (
                <Link
                  key={s._id}
                  href={
                    readOnly ? "#" : `/dashboard/workshops/${service.slug}/edit`
                  }
                  className="inline-flex items-center gap-1 border-2 border-black bg-fab-amber/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[1px_1px_0_0_#000]"
                >
                  <Calendar className="h-2.5 w-2.5" strokeWidth={3} />
                  {formatLabDate(s.date, {
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {formatLabTime(s.startTime)}
                </Link>
              ))
            ) : (
              <span className="text-[10px] font-bold text-black/30">
                No upcoming sessions
              </span>
            )}

            {!readOnly && (
              <button
                type="button"
                onClick={() => onAddSession(service._id)}
                className="inline-flex items-center gap-1 border-2 border-dashed border-black/30 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black/50 transition-all hover:border-black hover:text-black"
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                Session
              </button>
            )}
          </div>
        </div>
      </div>
    </BrandCard>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
        active
          ? "bg-fab-teal text-white"
          : "bg-white text-black hover:bg-black/5",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none",
            active ? "bg-white/20 text-white" : "bg-black/10 text-black/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// WorkshopsPage — two-tab layout
// ---------------------------------------------------------------------------

export function WorkshopsPage() {
  const profile = useProfile();
  const isClient = profile?.role === "client";

  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState<
    string | undefined
  >(undefined);

  // ── Data ──────────────────────────────────────────────────────────────
  const upcomingSessions = useQuery(
    api.workshopSessions.query.listUpcoming,
    {},
  );
  const services = useQuery(api.services.query.getServices);

  const workshopServices = useMemo(
    () => services?.filter((s) => s.serviceCategory.type === "WORKSHOP") ?? [],
    [services],
  );

  // Build a map of serviceId → upcoming sessions for the "All workshops" tab
  const sessionsByService = useMemo(() => {
    const map = new Map<string, SessionWithService[]>();
    if (upcomingSessions) {
      for (const s of upcomingSessions) {
        const list = map.get(s.serviceId) ?? [];
        list.push(s);
        map.set(s.serviceId, list);
      }
    }
    return map;
  }, [upcomingSessions]);

  // ── Loading state ─────────────────────────────────────────────────────
  const isLoading = upcomingSessions === undefined || services === undefined;

  // ── Handlers ──────────────────────────────────────────────────────────
  const openAddSession = useCallback((serviceId?: string) => {
    setPreselectedServiceId(serviceId);
    setAddDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setPreselectedServiceId(undefined);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <GridBackground />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* ── Header / Topbar ─────────────────────────────────────────── */}
        <DataViewPageHeader hideBorder>
          {/* Tabs */}
          <div className="flex shrink-0 gap-1 border-2 border-black bg-white p-0.5 shadow-[2px_2px_0_0_#000]">
            <TabButton
              active={activeTab === "upcoming"}
              onClick={() => setActiveTab("upcoming")}
              count={upcomingSessions?.length ?? 0}
            >
              Upcoming
            </TabButton>
            <TabButton
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              count={workshopServices.length}
            >
              All Workshops
            </TabButton>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          {!isClient && (
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/dashboard/workshops/add-workshop">
                <Button className="inline-flex h-8 items-center gap-1.5 border-2 border-black bg-fab-teal px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]">
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                  Add Workshop
                </Button>
              </Link>
              <Button
                onClick={() => openAddSession()}
                className="inline-flex h-8 items-center gap-1.5 border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                Add Session
              </Button>
            </div>
          )}
        </DataViewPageHeader>

        {/* ── Content area ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <BrandSkeleton key={`skel-${i}`} className="h-20" />
                ))}
              </div>
            ) : activeTab === "upcoming" ? (
              <UpcomingTab
                sessions={upcomingSessions ?? []}
                readOnly={isClient}
              />
            ) : (
              <AllWorkshopsTab
                services={workshopServices}
                sessionsByService={sessionsByService}
                readOnly={isClient}
                onAddSession={openAddSession}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add Session Dialog */}
      <AddSessionDialog
        open={addDialogOpen}
        onOpenChange={handleDialogOpenChange}
        preselectedServiceId={preselectedServiceId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Upcoming
// ---------------------------------------------------------------------------

function UpcomingTab({
  sessions,
  readOnly,
}: {
  sessions: SessionWithService[];
  readOnly: boolean;
}) {
  const pastSessions = useQuery(api.workshopSessions.query.listPast, {
    limit: 10,
  });

  if (sessions.length === 0 && (!pastSessions || pastSessions.length === 0)) {
    return (
      <BrandCard className="px-6 py-16 text-center shadow-[8px_8px_0_0_#000]">
        <div className="flex flex-col items-center justify-center">
          <Calendar
            className="mb-4 h-14 w-14 text-black/20"
            strokeWidth={1.5}
          />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-black">
            No upcoming sessions
          </h3>
          <p className="mt-2 max-w-md text-sm font-bold text-black/50">
            There are no upcoming workshop sessions scheduled. Add a session to
            get started.
          </p>
        </div>
      </BrandCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming sessions */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionRow
              key={session._id}
              session={session}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Past sessions divider */}
      {pastSessions && pastSessions.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-black/20" />
            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.15em] text-black/40">
              Past sessions (last 7 days)
            </span>
            <div className="h-0.5 flex-1 bg-black/20" />
          </div>

          {/* Past sessions at reduced opacity */}
          <div className="space-y-3 opacity-60">
            {pastSessions.map((session) => (
              <SessionRow
                key={session._id}
                session={session}
                readOnly
                variant="past"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: All Workshops (grid of service cards with session strips)
// ---------------------------------------------------------------------------

function AllWorkshopsTab({
  services,
  sessionsByService,
  readOnly,
  onAddSession,
}: {
  services: Array<{
    _id: string;
    name: string;
    slug: string;
    description: string;
    imageUrls: string[];
  }>;
  sessionsByService: Map<string, SessionWithService[]>;
  readOnly: boolean;
  onAddSession: (serviceId: string) => void;
}) {
  if (services.length === 0) {
    return (
      <BrandCard className="px-6 py-16 text-center shadow-[8px_8px_0_0_#000]">
        <div className="flex flex-col items-center justify-center">
          <FolderOpen
            className="mb-4 h-14 w-14 text-black/20"
            strokeWidth={1.5}
          />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-black">
            No workshops yet
          </h3>
          <p className="mt-2 max-w-md text-sm font-bold text-black/50">
            Create your first workshop service to make it available for clients
            to book.
          </p>
        </div>
      </BrandCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <WorkshopCard
          key={service._id}
          service={service}
          sessions={sessionsByService.get(service._id) ?? []}
          readOnly={readOnly}
          onAddSession={onAddSession}
        />
      ))}
    </div>
  );
}
