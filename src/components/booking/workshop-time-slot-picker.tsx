"use client";

import { Label } from "@/components/ui/label";
import {
  formatLabDate,
  formatLabTime,
  formatLabTime24,
  getLabDayStart,
  isSameLabDay,
} from "@/lib/lab-time";

export interface WorkshopTimeSlotValue {
  date: Date | undefined;
  startTime: string;
  endTime: string;
  originalDate?: number;
  originalStartTime?: number;
  originalEndTime?: number;
}

export interface WorkshopTimeSlot {
  startTime: number;
  endTime: number;
  maxSlots: number;
  usedUpSlots?: number;
}

export interface WorkshopSchedule {
  date: number;
  timeSlots: WorkshopTimeSlot[];
}

export interface WorkshopTimeSlotPickerProps {
  value: WorkshopTimeSlotValue;
  onChange: (value: WorkshopTimeSlotValue) => void;
  schedules?: WorkshopSchedule[];
}

const EMPTY_WORKSHOP_SCHEDULES: WorkshopSchedule[] = [];

export function WorkshopTimeSlotPicker({
  value,
  onChange,
  schedules = EMPTY_WORKSHOP_SCHEDULES,
}: WorkshopTimeSlotPickerProps) {
  return (
    <>
      <div className="flex flex-col gap-1 mb-2">
        <Label className="font-bold text-lg">
          Select Workshop Time Slot (PST)
        </Label>
        <p className="text-sm text-muted-foreground">
          Choose an available slot for this workshop. All dates and times are in
          Philippine Standard Time (PST).
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {schedules.map((schedule) => (
          <div key={schedule.date} className="space-y-3">
            <h4 className="font-semibold text-gray-900">
              {formatLabDate(schedule.date, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(schedule.timeSlots || []).map((slot) => {
                const startFormatted = formatLabTime24(slot.startTime);
                const endFormatted = formatLabTime24(slot.endTime);

                const isSelected =
                  (value?.date
                    ? isSameLabDay(value.date, schedule.date)
                    : false) &&
                  value?.startTime === startFormatted &&
                  value?.endTime === endFormatted;

                const usedUp = slot.usedUpSlots || 0;
                const isFull = usedUp >= slot.maxSlots;

                return (
                  <div
                    key={`${schedule.date}-${slot.startTime}-${slot.endTime}`}
                    onClick={() => {
                      if (isFull) return;
                      onChange({
                        date: getLabDayStart(schedule.date),
                        startTime: startFormatted,
                        endTime: endFormatted,
                        originalDate: schedule.date,
                        originalStartTime: slot.startTime,
                        originalEndTime: slot.endTime,
                      });
                    }}
                    className={`rounded-lg border p-4 transition-colors ${
                      isFull
                        ? "bg-gray-100 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "cursor-pointer border-primary bg-primary/5 ring-1 ring-primary"
                          : "cursor-pointer border-gray-200 bg-white hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900">
                      {formatLabTime(slot.startTime)} -{" "}
                      {formatLabTime(slot.endTime)} (PST)
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                      {isFull ? (
                        <span className="text-destructive font-medium">
                          Fully Booked
                        </span>
                      ) : (
                        `${slot.maxSlots - usedUp} / ${slot.maxSlots} slots available`
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {(!schedules || schedules.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No schedules available for this workshop.
          </p>
        )}
      </div>
    </>
  );
}
