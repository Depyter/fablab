"use client";

import { Label } from "@/components/ui/label";
import {
  formatLabDate,
  formatLabTime,
  formatLabTime24,
  getCurrentTimestamp,
  getLabDayStart,
  isSameLabDay,
} from "@/lib/lab-time";
import posthog from "posthog-js";

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
  serviceName?: string;
  serviceCategory?: string;
}

const EMPTY_WORKSHOP_SCHEDULES: WorkshopSchedule[] = [];

export function WorkshopTimeSlotPicker({
  value,
  onChange,
  schedules = EMPTY_WORKSHOP_SCHEDULES,
  serviceName,
  serviceCategory,
}: WorkshopTimeSlotPickerProps) {
  return (
    <>
      <div className="mb-2 flex flex-col gap-1">
        <Label className="text-lg font-black uppercase tracking-tighter">
          Select Workshop Time Slot (PST)
        </Label>
      </div>
      <div className="flex flex-col gap-6">
        {schedules
          .filter(
            (schedule) =>
              schedule.date >= getLabDayStart(getCurrentTimestamp()).getTime(),
          )
          .map((schedule) => (
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
                        const newValue = {
                          date: getLabDayStart(schedule.date),
                          startTime: startFormatted,
                          endTime: endFormatted,
                          originalDate: schedule.date,
                          originalStartTime: slot.startTime,
                          originalEndTime: slot.endTime,
                        };
                        posthog.capture("booking_workshop_slot_selected", {
                          service_name: serviceName,
                          service_category: serviceCategory,
                          workshop_date: schedule.date,
                          start_time: startFormatted,
                          end_time: endFormatted,
                          available_slots:
                            slot.maxSlots - (slot.usedUpSlots || 0),
                          max_slots: slot.maxSlots,
                        });
                        onChange(newValue);
                      }}
                      className={`rounded-lg border-2 p-4 shadow-[2px_2px_0_0_#000] transition-all ${
                        isFull
                          ? "cursor-not-allowed border-black/20 bg-gray-200 opacity-60"
                          : isSelected
                            ? "cursor-pointer border-black bg-fab-teal/15 -translate-x-0.5 -translate-y-0.5"
                            : "cursor-pointer border-black bg-background hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-fab-amber/20"
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
