"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

function getActivePresetLabel(dateFrom: number) {
  for (const preset of PRESETS) {
    const expected = getPresetTimestamp(preset.days);
    if (Math.abs(dateFrom - expected) < 60000) {
      return preset.label;
    }
  }
  return null;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function PresetList({
  onDateFromChange,
  onDateToChange,
  onSelect,
}: {
  onDateFromChange: (value: number) => void;
  onDateToChange: (value: number) => void;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          variant="ghost"
          size="sm"
          className="h-9 justify-start text-sm px-3 font-normal"
          onClick={() => {
            const from = getPresetTimestamp(preset.days);
            onDateFromChange(from);
            onDateToChange(Date.now());
            onSelect();
          }}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}

export function ReportDateRange({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: ReportDateRangeProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const close = React.useCallback(() => setOpen(false), []);

  const activeLabel = getActivePresetLabel(dateFrom);

  const trigger = (
    <Button variant="default" size="sm" className="h-8 shrink-0 gap-1.5">
      <CalendarDays className="h-4 w-4 text-primary-foreground/70" />
      <span className="text-sm whitespace-nowrap">
        <span
          className={
            activeLabel
              ? "text-primary-foreground font-medium"
              : "text-primary-foreground/70"
          }
        >
          {activeLabel}
        </span>
      </span>
    </Button>
  );

  const presets = (
    <PresetList
      onDateFromChange={onDateFromChange}
      onDateToChange={onDateToChange}
      onSelect={close}
    />
  );

  const dateRangeText = `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85svh] gap-0 rounded-t-2xl p-0"
        >
          <div className="space-y-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">{dateRangeText}</p>
            {presets}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-48 p-1.5">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs text-muted-foreground border-b">
            {dateRangeText}
          </p>
          {presets}
        </div>
      </PopoverContent>
    </Popover>
  );
}
