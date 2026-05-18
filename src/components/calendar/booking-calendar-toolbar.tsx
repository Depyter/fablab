"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LAB_TIME_ZONE } from "@/lib/lab-time";
import { cn } from "@/lib/utils";
import type { CalendarVisibleRange } from "./calendar-state";

export function CalendarNavigation({
  date,
  visibleRange,
  onSelectDate,
  onPrevPeriod,
  onNextPeriod,
  onReset,
  className,
}: {
  date: Date;
  visibleRange: CalendarVisibleRange;
  onSelectDate: (date: Date | undefined) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      <button
        type="button"
        onClick={onPrevPeriod}
        className="flex h-7 w-7 items-center justify-center text-black/50 hover:text-black"
        aria-label={visibleRange.previousLabel}
        title={visibleRange.previousLabel}
      >
        <ChevronLeft className="size-3.5" strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={onNextPeriod}
        className="flex h-7 w-7 items-center justify-center text-black/50 hover:text-black"
        aria-label={visibleRange.nextLabel}
        title={visibleRange.nextLabel}
      >
        <ChevronRight className="size-3.5" strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={onReset}
        className="hidden h-7 items-center px-2 text-[10px] font-black uppercase tracking-wider text-black/50 hover:text-black sm:inline-flex"
      >
        Today
      </button>

      <div className="mx-1 h-4 w-px bg-black hidden sm:block" />

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 max-w-full items-center gap-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-black/50 hover:text-black"
          >
            <CalendarIcon className="size-3.5" strokeWidth={3} />
            <span className="truncate hidden sm:inline">
              {visibleRange.label}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="start">
          <Calendar
            mode="single"
            timeZone={LAB_TIME_ZONE}
            selected={date}
            onSelect={onSelectDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
