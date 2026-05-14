"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

interface ReportDateRangeProps {
  dateFrom: number;
  dateTo: number;
  onDateFromChange: (value: number) => void;
  onDateToChange: (value: number) => void;
}

const PRESETS = [
  { label: "This Week", days: 7 },
  { label: "This Month", days: 30 },
  { label: "Last 3 Months", days: 90 },
  { label: "This Year", days: 365 },
] as const;

function getPresetTimestamp(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function ReportDateRange({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: ReportDateRangeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {formatDate(dateFrom)} – {formatDate(dateTo)}
      </span>
      <div className="flex gap-1 ml-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => {
              const from = getPresetTimestamp(preset.days);
              onDateFromChange(from);
              onDateToChange(Date.now());
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
