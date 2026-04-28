"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CalendarIcon, Clock2Icon } from "lucide-react";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 18; h++) {
  const hourStr = h.toString().padStart(2, "0");
  TIME_SLOTS.push(`${hourStr}:00`);
  if (h < 18) {
    TIME_SLOTS.push(`${hourStr}:30`);
  }
}

const formatTimeLabel = (time: string) => {
  const [h, m] = time.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${m} ${ampm}`;
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
}

type BookedTimeBlock = { start: string; end: string };

const EMPTY_AVAILABLE_DAYS: number[] = [];
const EMPTY_BOOKED_TIME_BLOCKS: BookedTimeBlock[] = [];

export function DateTimePicker({
  value,
  onChange,
  availableDays = EMPTY_AVAILABLE_DAYS,
  bookedTimeBlocks = EMPTY_BOOKED_TIME_BLOCKS,
}: DateTimePickerProps) {
  const { date, startTime, endTime } = value;

  // Example of how you would handle showing available dates:
  // 1. Fetch `bookedDates` or `availability` from the backend (e.g. via Convex query).
  // 2. Disable dates that are fully booked for the requested service.
  // 3. Highlight available dates using `modifiers`.
  const bookedDates: Date[] = []; // Replace with actual booked dates array

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Disable any date before today
    if (date < today) return true;

    // If availableDays are specified, disable dates that don't fall on those days
    if (availableDays.length > 0 && !availableDays.includes(date.getDay())) {
      return true;
    }

    // Disable explicitly booked dates
    return bookedDates.some(
      (booked) =>
        booked.getFullYear() === date.getFullYear() &&
        booked.getMonth() === date.getMonth() &&
        booked.getDate() === date.getDate(),
    );
  };

  const isTimeSlotBooked = (timeSlot: string) => {
    if (!date) return true; // Require date selection first

    // Disable times that have already passed today
    const now = new Date();
    if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    ) {
      const [h, m] = timeSlot.split(":").map(Number);
      if (
        h < now.getHours() ||
        (h === now.getHours() && m < now.getMinutes())
      ) {
        return true;
      }
    }

    return bookedTimeBlocks.some(
      (block) => timeSlot >= block.start && timeSlot < block.end,
    );
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onChange({ ...value, date: selectedDate });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="date">Date (PST)</FieldLabel>
        <Popover>
          <div className="relative">
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={`w-full justify-start text-left font-normal rounded-lg ${!date && "text-muted-foreground"}`}
              >
                {date ? format(date, "MM/dd/yyyy") : <span>MM/DD/YYYY</span>}
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <input
              type="text"
              required
              value={date ? date.toISOString() : ""}
              className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
              tabIndex={-1}
              onChange={() => {}}
            />
          </div>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              modifiers={{
                booked: bookedDates,
              }}
              modifiersClassNames={{
                booked:
                  "[&>button]:line-through text-muted-foreground opacity-50",
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field>
        <FieldLabel htmlFor="time-from">Start Time (PST)</FieldLabel>
        <div className="relative">
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
              className="w-full bg-background rounded-lg h-10"
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
        <FieldLabel htmlFor="time-to">End Time (PST)</FieldLabel>
        <div className="relative">
          <Select
            value={endTime}
            onValueChange={(val) => onChange({ ...value, endTime: val })}
            disabled={!startTime}
          >
            <SelectTrigger
              id="time-to"
              className="w-full bg-background rounded-lg h-10"
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
                    (block) => startTime < block.end && slot > block.start,
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
