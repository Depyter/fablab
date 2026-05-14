"use client";

import * as React from "react";
import { ViewHeaderMain } from "@/components/ui/view-header";
import { DataViewPageHeader } from "@/components/manage/data-view-page-header";
import { ReportDateRange } from "@/components/reports/report-date-range";
import { getCurrentTimestamp } from "@/lib/lab-time";
import { ReportsClient } from "./_client";

function ReportsPageHeader({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  dateFrom: number;
  dateTo: number;
  onDateFromChange: (value: number) => void;
  onDateToChange: (value: number) => void;
}) {
  return (
    <DataViewPageHeader>
      <ViewHeaderMain>
        <h1 className="text-lg font-semibold shrink-0">Reports</h1>
        <div className="flex shrink-0 items-center gap-2 ml-auto">
          <ReportDateRange
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
          />
        </div>
      </ViewHeaderMain>
    </DataViewPageHeader>
  );
}

function getMonthStart() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function useMonthRange() {
  const now = React.useMemo(() => getCurrentTimestamp(), []);
  const monthStart = React.useMemo(() => getMonthStart(), []);

  const [dateFrom, setDateFrom] = React.useState(monthStart);
  const [dateTo, setDateTo] = React.useState(now);

  return { dateFrom, dateTo, setDateFrom, setDateTo };
}

export function ReportsPageContent() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useMonthRange();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <ReportsPageHeader
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <ReportsClient dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  );
}
