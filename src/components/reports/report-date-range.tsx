"use client";

import * as React from "react";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  applyPreset: (days: number) => void;
  onCustomRange: () => void;
  dateRangeText: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="border-b-2 border-black px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-black/60">
        {dateRangeText}
      </p>
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className="flex h-9 w-full items-center justify-start border-b-2 border-black/10 px-3 text-[10px] font-black uppercase tracking-wider text-black/60 transition-colors hover:text-black"
          onClick={() => {
            applyPreset(preset.days);
          }}
        >
          {preset.label}
        </button>
      ))}
      <div className="mt-1 pt-1">
        <button
          type="button"
          className="flex h-9 w-full items-center justify-start px-3 text-[10px] font-black uppercase tracking-wider text-fab-teal transition-colors hover:text-black"
          onClick={onCustomRange}
        >
          Custom Range…
        </button>
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

  const selectedPreset = getPresetLabelForTimestamp(dateFrom);

  // View tracking: presets list or custom calendar
  const [view, setView] = React.useState<"presets" | "custom">(
    getPresetLabelForTimestamp(dateFrom) ? "presets" : "custom",
  );

  const applyPreset = React.useCallback(
    (days: number) => {
      const from = getPresetTimestamp(days);
      onDateFromChange(from);
      onDateToChange(Date.now());
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
    },
    [onDateFromChange, onDateToChange],
  );

  const activeLabel = selectedPreset;
  const dateRangeText = `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;

  const trigger = (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-1.5 border-2 border-black bg-white px-3 text-[10px] font-black uppercase tracking-wider text-black"
    >
      <CalendarDays className="size-4" strokeWidth={3} />
      <span>{activeLabel ?? (isMobile ? "Custom Range" : dateRangeText)}</span>
    </button>
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
          className="border-t-4 border-black bg-white p-0 shadow-[0_-4px_0_0_#000]"
          aria-labelledby={TITLE_ID}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Select report date range</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/60">
              {dateRangeText}
            </p>
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
        className="w-auto border-2 border-black bg-white p-0 shadow-[4px_4px_0_0_#000]"
        aria-labelledby={TITLE_ID}
      >
        {dialogTitle}
        {view === "presets" ? (
          <div className="w-48 p-2">
            <PresetList
              applyPreset={applyPreset}
              onCustomRange={() => setView("custom")}
              dateRangeText={dateRangeText}
            />
          </div>
        ) : (
          <div className="p-2">
            <div className="mb-2 flex items-center gap-2 border-b-2 border-black px-3 pb-2">
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 text-[10px] font-black uppercase tracking-wider text-black/60 hover:text-black"
                onClick={() => setView("presets")}
              >
                <ArrowLeft className="size-3.5" strokeWidth={3} />
                Presets
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-black/60">
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
