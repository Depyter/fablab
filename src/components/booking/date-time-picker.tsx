"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CalendarIcon, Clock2Icon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatLabClockTime,
  formatLabDateNumeric,
  getCurrentTimestamp,
  getLabDayKey,
  getLabDayStart,
  getLabDayStartTimestamp,
  getLabTimeTimestamp,
  getLabWeekday,
  isLabDateBeforeToday,
  isLabTimeInPast,
  LAB_TIME_ZONE,
} from "@/lib/lab-time";

const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 18; h++) {
  const hourStr = h.toString().padStart(2, "0");
  TIME_SLOTS.push(`${hourStr}:00`);
  if (h < 18) {
    TIME_SLOTS.push(`${hourStr}:30`);
  }
}

/**
 * The last start-time that has a valid end-time after it.
 * `18:00` is a valid start in TIME_SLOTS but has no later slot for the
 * end-time selector, so the real cut-off is the second-to-last entry.
 */
const LAST_VIABLE_START_TIME = TIME_SLOTS[TIME_SLOTS.length - 2];

const formatTimeLabel = (time: string) => {
  return formatLabClockTime(time);
};

export interface DateTimePickerValue {
  date: Date | undefined;
  startTime: string;
  endTime: string;
}

export interface DateTimePickerProps {
  value: DateTimePickerValue;
  onChange: (value: DateTimePickerValue) => void;
  availableDays?: number[];
  bookedTimeBlocks?: { start: string; end: string }[];
  allowPastSelection?: boolean;
}

type BookedTimeBlock = { start: string; end: string };

const EMPTY_AVAILABLE_DAYS: number[] = [];
const EMPTY_BOOKED_TIME_BLOCKS: BookedTimeBlock[] = [];

export function DateTimePicker({
  value,
  onChange,
  availableDays = EMPTY_AVAILABLE_DAYS,
  bookedTimeBlocks = EMPTY_BOOKED_TIME_BLOCKS,
  allowPastSelection = false,
}: DateTimePickerProps) {
  const { date, startTime, endTime } = value;

  const isDateDisabled = useCallback(
    (nextDate: Date) => {
      if (!allowPastSelection && isLabDateBeforeToday(nextDate)) return true;

      // Disable today if the current time has passed the last viable
      // start-time — every time slot would already be in the past.
      if (!allowPastSelection) {
        const now = getCurrentTimestamp();
        const todayStart = getLabDayStartTimestamp(now);
        const nextDateStart = getLabDayStartTimestamp(nextDate);
        if (
          nextDateStart === todayStart &&
          now > getLabTimeTimestamp(nextDate, LAST_VIABLE_START_TIME)
        ) {
          return true;
        }
      }

      if (
        availableDays.length > 0 &&
        !availableDays.includes(getLabWeekday(nextDate))
      ) {
        return true;
      }

      return false;
    },
    [allowPastSelection, availableDays],
  );

  const isTimeSlotBooked = useCallback(
    (timeSlot: string) => {
      if (!date) return true;

      if (
        (!allowPastSelection &&
          isLabDateBeforeToday(date, getCurrentTimestamp())) ||
        (!allowPastSelection &&
          isLabTimeInPast(date, timeSlot, getCurrentTimestamp()))
      ) {
        return true;
      }

      return bookedTimeBlocks.some(
        (block) => timeSlot >= block.start && timeSlot < block.end,
      );
    },
    [date, allowPastSelection, bookedTimeBlocks],
  );

  const handleDateSelect = useCallback(
    (selectedDate: Date | undefined) => {
      onChange({
        ...value,
        date: selectedDate ? getLabDayStart(selectedDate) : undefined,
      });
    },
    [onChange, value],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel
          htmlFor="date"
          className="font-black uppercase tracking-[0.2em] text-xs"
        >
          Date (PST) <span className="text-fab-magenta">*</span>
        </FieldLabel>
        <Popover>
          <div className="relative">
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={`w-full justify-start rounded-lg border-2 border-black bg-background text-left font-black uppercase shadow-[2px_2px_0_0_#000] ${!date && "text-muted-foreground"}`}
              >
                {date ? formatLabDateNumeric(date) : <span>MM/DD/YYYY</span>}
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <input
              type="text"
              required
              value={date ? getLabDayKey(date) : ""}
              className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
              tabIndex={-1}
              onChange={() => {}}
            />
          </div>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              timeZone={LAB_TIME_ZONE}
              selected={date}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field>
        <FieldLabel
          htmlFor="time-from"
          className="font-black uppercase tracking-[0.2em] text-xs"
        >
          Start Time (PST) <span className="text-fab-magenta">*</span>
        </FieldLabel>
        <div className="relative">
          <TooltipProvider delayDuration={200}>
            <Tooltip open={!date ? undefined : false}>
              <TooltipTrigger asChild>
                <div>
                  <Select
                    value={startTime}
                    onValueChange={(val) => {
                      const updates = { ...value, startTime: val };
                      if (value.endTime && val >= value.endTime) {
                        updates.endTime = "";
                      }
                      onChange(updates);
                    }}
                  >
                    <SelectTrigger
                      id="time-from"
                      className="w-full bg-background rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] h-10 focus-visible:ring-0"
                      disabled={!date}
                    >
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => {
                        const disabled = isTimeSlotBooked(slot);
                        return (
                          <SelectItem
                            key={`start-${slot}`}
                            value={slot}
                            disabled={disabled}
                          >
                            <div className="flex items-center gap-2">
                              <Clock2Icon className="h-4 w-4 opacity-50" />
                              <span>{formatTimeLabel(slot)}</span>
                              {disabled && (
                                <span className="text-[10px] opacity-50 ml-2">
                                  (Unavailable)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {!date && (
                <TooltipContent side="right" className="text-sm font-medium">
                  Please select a date first before setting the start time
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <input
            type="text"
            required
            value={startTime}
            className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
            tabIndex={-1}
            onChange={() => {}}
          />
        </div>
      </Field>
      <Field>
        <FieldLabel
          htmlFor="time-to"
          className="font-black uppercase tracking-[0.2em] text-xs"
        >
          End Time (PST) <span className="text-fab-magenta">*</span>
        </FieldLabel>
        <div className="relative">
          <TooltipProvider delayDuration={200}>
            <Tooltip open={!startTime ? undefined : false}>
              <TooltipTrigger asChild>
                <div>
                  <Select
                    value={endTime}
                    onValueChange={(val) =>
                      onChange({ ...value, endTime: val })
                    }
                    disabled={!startTime}
                  >
                    <SelectTrigger
                      id="time-to"
                      className="w-full bg-background rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] h-10 focus-visible:ring-0"
                    >
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => {
                        const isBeforeOrEqualStart = startTime
                          ? slot <= startTime
                          : false;

                        let isOverlapping = false;
                        if (startTime && slot > startTime) {
                          isOverlapping = bookedTimeBlocks.some(
                            (block) =>
                              startTime < block.end && slot > block.start,
                          );
                        }

                        const disabled =
                          isTimeSlotBooked(slot) ||
                          isBeforeOrEqualStart ||
                          isOverlapping;
                        return (
                          <SelectItem
                            key={`end-${slot}`}
                            value={slot}
                            disabled={disabled}
                          >
                            <div className="flex items-center gap-2">
                              <Clock2Icon className="h-4 w-4 opacity-50" />
                              <span>{formatTimeLabel(slot)}</span>
                              {disabled && (
                                <span className="text-[10px] opacity-50 ml-2">
                                  {isBeforeOrEqualStart ? "" : "(Unavailable)"}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {!startTime && (
                <TooltipContent side="right" className="text-sm font-medium">
                  Please select a start time first before setting the end time
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <input
            type="text"
            required
            value={endTime}
            className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
            tabIndex={-1}
            onChange={() => {}}
          />
        </div>
      </Field>
    </div>
  );
}
