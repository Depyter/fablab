"use client";

import * as React from "react";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

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

const TITLE_ID = "report-date-range-title";

function getPresetTimestamp(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getPresetLabelForTimestamp(dateFrom: number) {
  for (const preset of PRESETS) {
    const expected = getPresetTimestamp(preset.days);
    if (Math.abs(dateFrom - expected) < 86400000) {
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
  applyPreset,
  onCustomRange,
  dateRangeText,
}: {
  applyPreset: (days: number, label: string) => void;
  onCustomRange: () => void;
  dateRangeText: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-xs text-muted-foreground border-b">
        {dateRangeText}
      </p>
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          variant="ghost"
          size="sm"
          className="h-9 justify-start text-sm px-3 font-normal"
          onClick={() => {
            applyPreset(preset.days, preset.label);
          }}
        >
          {preset.label}
        </Button>
      ))}
      <div className="border-t mt-1 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 justify-start text-sm px-3 font-normal w-full"
          onClick={onCustomRange}
        >
          Custom Range…
        </Button>
      </div>
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

  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(
    () => getPresetLabelForTimestamp(dateFrom),
  );

  // View tracking: presets list or custom calendar
  const [view, setView] = React.useState<"presets" | "custom">(
    getPresetLabelForTimestamp(dateFrom) ? "presets" : "custom",
  );

  // Sync selectedPreset when dateFrom changes externally
  React.useEffect(() => {
    setSelectedPreset(getPresetLabelForTimestamp(dateFrom));
  }, [dateFrom]);

  const applyPreset = React.useCallback(
    (days: number, label: string) => {
      const from = getPresetTimestamp(days);
      onDateFromChange(from);
      onDateToChange(Date.now());
      setSelectedPreset(label);
      setView("presets");
      close();
    },
    [onDateFromChange, onDateToChange, close],
  );

  // Commit the range immediately so queries update in real-time
  // but don't close — the user can keep adjusting or click outside
  const handleRangeSelect = React.useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from || !range?.to) return;
      onDateFromChange(range.from.getTime());
      onDateToChange(range.to.getTime());
      setSelectedPreset(null);
    },
    [onDateFromChange, onDateToChange],
  );

  const activeLabel = selectedPreset;
  const dateRangeText = `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;

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
          {activeLabel ?? (isMobile ? "Custom Range" : dateRangeText)}
        </span>
      </span>
    </Button>
  );

  const dialogTitle = (
    <h2 id={TITLE_ID} className="sr-only">
      Select report date range
    </h2>
  );

  const calendar = (
    <Calendar
      mode="range"
      selected={{ from: new Date(dateFrom), to: new Date(dateTo) }}
      onSelect={handleRangeSelect}
      defaultMonth={new Date(dateFrom)}
      numberOfMonths={isMobile ? 1 : 2}
      className="w-full"
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85svh] gap-0 rounded-t-2xl p-0"
          aria-labelledby={TITLE_ID}
        >
          {dialogTitle}
          <div className="space-y-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">{dateRangeText}</p>
            {calendar}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto p-0"
        aria-labelledby={TITLE_ID}
      >
        {dialogTitle}
        {view === "presets" ? (
          <div className="w-48 p-1.5">
            <PresetList
              applyPreset={applyPreset}
              onCustomRange={() => setView("custom")}
              dateRangeText={dateRangeText}
            />
          </div>
        ) : (
          <div className="p-1.5">
            <div className="flex items-center gap-2 px-3 pb-1 border-b mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-0 text-xs font-normal"
                onClick={() => setView("presets")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Presets
              </Button>
              <span className="text-xs text-muted-foreground">
                {dateRangeText}
              </span>
            </div>
            {calendar}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
