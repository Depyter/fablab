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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { format } from "date-fns";

export interface DateTimePickerValue {
  date: Date | undefined;
  startTime: string;
  endTime: string;
}

export interface DateTimePickerProps {
  value: DateTimePickerValue;
  onChange: (value: DateTimePickerValue) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { date, startTime, endTime } = value;

  const bookedDates = Array.from(
    { length: 15 },
    (_, i) => new Date(new Date().getFullYear(), 2, 6 + i),
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onChange({ ...value, date: selectedDate });
  };

  const formatDateTime = (d: Date, time: string) => {
    const [hours, minutes] = time.split(":");
    const tempDate = new Date(d);
    tempDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return (
      tempDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " at " +
      tempDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="date">Date</FieldLabel>
        <Popover>
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
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={bookedDates}
              modifiers={{
                booked: bookedDates,
              }}
              modifiersClassNames={{
                booked: "[&>button]:line-through",
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field>
        <FieldLabel htmlFor="time-from">Start Time</FieldLabel>
        <InputGroup className="rounded-lg">
          <InputGroupInput
            id="time-from"
            type="time"
            value={startTime}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
            className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
          <InputGroupAddon>
            <Clock2Icon className="text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="time-to">End Time</FieldLabel>
        <InputGroup className="rounded-lg">
          <InputGroupInput
            id="time-to"
            type="time"
            value={endTime}
            onChange={(e) => onChange({ ...value, endTime: e.target.value })}
            className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
          <InputGroupAddon>
            <Clock2Icon className="text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </div>
  );
}
