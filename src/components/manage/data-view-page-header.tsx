"use client";

import type * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type DataViewPageHeaderProps = {
  children: React.ReactNode;
  className?: string;
  /** Remove the bottom border so a tab list can sit flush beneath */
  hideBorder?: boolean;
};

/**
 * Single shared header for all data-view pages (workshops, projects,
 * inventory, services, reports, users).
 *
 * Includes the brand amber bar, grid background, sidebar trigger, and a
 * flexible area for page-specific filter controls.
 */
export function DataViewPageHeader({
  children,
  className,
  hideBorder,
}: DataViewPageHeaderProps) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <>
      {/* Grid Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-15"
      />

      {/* Amber bar */}
      <div
        className={cn(
          "relative z-10 bg-fab-amber",
          !hideBorder && "border-b-4 border-black",
          className,
        )}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={open ? "Close Sidebar" : "Open Sidebar"}
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-white text-black"
          >
            {open ? (
              <ChevronLeft className="size-4" strokeWidth={4} />
            ) : (
              <ChevronRight className="size-4" strokeWidth={4} />
            )}
          </button>
          <div className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
