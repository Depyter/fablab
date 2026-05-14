"use client";

import { ViewHeaderMain } from "@/components/ui/view-header";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import { ReportsClient } from "./_client";

export function ReportsPageContent() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <DataViewPageHeader>
        <ViewHeaderMain>
          <h1 className="text-lg font-semibold">Reports</h1>
        </ViewHeaderMain>
      </DataViewPageHeader>
      <ReportsClient />
    </div>
  );
}
