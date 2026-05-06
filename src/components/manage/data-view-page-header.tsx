"use client";

import type * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ViewHeader, ViewHeaderRow } from "@/components/ui/view-header";

export function DataViewPageHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewHeader>
      <ViewHeaderRow>
        <SidebarTrigger className="-ml-1 shrink-0 text-sidebar-foreground/50 transition-colors hover:text-primary" />
        {children}
      </ViewHeaderRow>
    </ViewHeader>
  );
}
