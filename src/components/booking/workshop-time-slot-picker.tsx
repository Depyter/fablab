"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

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
  const getLocalTimeString = (dateNum: number) => {
    const d = new Date(dateNum);
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
              {new Date(schedule.date).toLocaleDateString("en-US", {
                timeZone: "Asia/Manila",
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(schedule.timeSlots || []).map((slot) => {
                const startFormatted = getLocalTimeString(slot.startTime);
                const endFormatted = getLocalTimeString(slot.endTime);

                const isSelected =
                  value?.date?.getTime() ===
                    new Date(schedule.date).getTime() &&
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
                        date: new Date(schedule.date),
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
                      {new Date(slot.startTime).toLocaleTimeString("en-US", {
                        timeZone: "Asia/Manila",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(slot.endTime).toLocaleTimeString("en-US", {
                        timeZone: "Asia/Manila",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      (PST)
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
