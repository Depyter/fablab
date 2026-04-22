"use client";

import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FormSection } from "@/components/ui/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, X } from "lucide-react";

const formatTimeForInput = (val: number | undefined) => {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const handleTimeChange = (
  val: string,
  baseDate: number,
  onChange: (time: number) => void,
) => {
  if (!val) return;
  const [h, m] = val.split(":");
  const d = new Date(baseDate || Date.now());
  const dateString = d.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(`${dateString} ${h}:${m}:00 GMT+0800`);
  onChange(manilaDate.getTime());
};

const getDefaultTime = (baseDate: number, hours: number, minutes: number) => {
  const d = new Date(baseDate || Date.now());
  const dateString = d.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  const manilaDate = new Date(`${dateString} ${h}:${m}:00 GMT+0800`);
  return manilaDate.getTime();
};

export const WorkshopScheduleForm = withForm({
  ...addServiceFormOpts,
  render: function WorkshopScheduleRender({ form }) {
    return (
      <div className="w-full sm:max-w-3xl">
        <form.Subscribe
          selector={(state) => state.values.serviceCategory}
          children={(serviceCategory) =>
            serviceCategory === "WORKSHOP" ? (
              <FormSection
                title="Workshop Schedule"
                description="Configure dates and time slots for this workshop. All dates and times are evaluated in Philippine Standard Time (PST/GMT+8)."
              >
                <form.Field
                  name="schedules"
                  mode="array"
                  children={(schedulesField) => (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label>Schedules</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = Date.now();
                            schedulesField.pushValue({
                              date: now,
                              timeSlots: [
                                {
                                  startTime: getDefaultTime(now, 9, 0),
                                  endTime: getDefaultTime(now, 10, 0),
                                  maxSlots: 1,
                                },
                              ],
                            });
                          }}
                        >
                          Add Date
                        </Button>
                      </div>
                      {(schedulesField.state.value || []).map(
                        (_, scheduleIndex) => (
                          <div
                            key={scheduleIndex}
                            className="p-4 border rounded-md space-y-4 relative bg-card"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive z-10"
                              onClick={() =>
                                schedulesField.removeValue(scheduleIndex)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>

                            <form.Field
                              name={`schedules[${scheduleIndex}].date`}
                              children={(dateField) => (
                                <div className="space-y-2 flex flex-col w-[240px]">
                                  <Label>Date</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !dateField.state.value &&
                                            "text-muted-foreground",
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateField.state.value ? (
                                          format(
                                            new Date(dateField.state.value),
                                            "PPP",
                                          )
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="single"
                                        selected={
                                          dateField.state.value
                                            ? new Date(dateField.state.value)
                                            : undefined
                                        }
                                        onSelect={(date) => {
                                          const newDate = date
                                            ? date.getTime()
                                            : undefined;
                                          if (!newDate) {
                                            dateField.handleChange(newDate);
                                            return;
                                          }
                                          const schedule = (schedulesField.state
                                            .value || [])[scheduleIndex];
                                          const currentSlots =
                                            schedule.timeSlots || [];
                                          const updatedSlots = currentSlots.map(
                                            (slot: {
                                              startTime: number;
                                              endTime: number;
                                              maxSlots: number;
                                              usedUpSlots?: number;
                                            }) => {
                                              const start = new Date(
                                                slot.startTime,
                                              );
                                              const end = new Date(
                                                slot.endTime,
                                              );

                                              const startStr =
                                                start.toLocaleTimeString(
                                                  "en-GB",
                                                  {
                                                    timeZone: "Asia/Manila",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  },
                                                );
                                              const endStr =
                                                end.toLocaleTimeString(
                                                  "en-GB",
                                                  {
                                                    timeZone: "Asia/Manila",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  },
                                                );

                                              const newDateStr = new Date(
                                                newDate,
                                              ).toLocaleDateString("en-US", {
                                                timeZone: "Asia/Manila",
                                              });

                                              const newStart = new Date(
                                                `${newDateStr} ${startStr}:00 GMT+0800`,
                                              );
                                              const newEnd = new Date(
                                                `${newDateStr} ${endStr}:00 GMT+0800`,
                                              );

                                              return {
                                                ...slot,
                                                startTime: newStart.getTime(),
                                                endTime: newEnd.getTime(),
                                              };
                                            },
                                          );
                                          const allSchedules = [
                                            ...(schedulesField.state.value ||
                                              []),
                                          ];
                                          allSchedules[scheduleIndex] = {
                                            ...schedule,
                                            date: newDate,
                                            timeSlots: updatedSlots,
                                          };
                                          schedulesField.handleChange(
                                            allSchedules,
                                          );
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              )}
                            />

                            <form.Field
                              name={`schedules[${scheduleIndex}].timeSlots`}
                              mode="array"
                              children={(timeSlotsField) => (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label>Time Slots (PST)</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const baseDate =
                                          (schedulesField.state.value || [])[
                                            scheduleIndex
                                          ]?.date || Date.now();
                                        timeSlotsField.pushValue({
                                          startTime: getDefaultTime(
                                            baseDate,
                                            9,
                                            0,
                                          ),
                                          endTime: getDefaultTime(
                                            baseDate,
                                            10,
                                            0,
                                          ),
                                          maxSlots: 1,
                                        });
                                      }}
                                    >
                                      Add Slot
                                    </Button>
                                  </div>
                                  <div className="flex flex-col divide-y">
                                    {(timeSlotsField.state.value || []).map(
                                      (_, slotIndex) => (
                                        <div
                                          key={slotIndex}
                                          className="flex flex-col gap-4 py-4 first:pt-2 last:pb-0"
                                        >
                                          <div className="flex items-end justify-between gap-4">
                                            <div className="flex flex-wrap items-center gap-4 flex-1">
                                              <form.Field
                                                name={`schedules[${scheduleIndex}].timeSlots[${slotIndex}].startTime`}
                                                children={(subField) => (
                                                  <div className="flex flex-col gap-3">
                                                    <Label className="px-1">
                                                      From
                                                    </Label>
                                                    <Input
                                                      type="time"
                                                      className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                                      value={formatTimeForInput(
                                                        subField.state.value,
                                                      )}
                                                      onChange={(e) =>
                                                        handleTimeChange(
                                                          e.target.value,
                                                          (schedulesField.state
                                                            .value || [])[
                                                            scheduleIndex
                                                          ]?.date || Date.now(),
                                                          subField.handleChange,
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              />
                                              <form.Field
                                                name={`schedules[${scheduleIndex}].timeSlots[${slotIndex}].endTime`}
                                                children={(subField) => (
                                                  <div className="flex flex-col gap-3">
                                                    <Label className="px-1">
                                                      To
                                                    </Label>
                                                    <Input
                                                      type="time"
                                                      className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                                      value={formatTimeForInput(
                                                        subField.state.value,
                                                      )}
                                                      onChange={(e) =>
                                                        handleTimeChange(
                                                          e.target.value,
                                                          (schedulesField.state
                                                            .value || [])[
                                                            scheduleIndex
                                                          ]?.date || Date.now(),
                                                          subField.handleChange,
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              />
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                              onClick={() =>
                                                timeSlotsField.removeValue(
                                                  slotIndex,
                                                )
                                              }
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          <form.Field
                                            name={`schedules[${scheduleIndex}].timeSlots[${slotIndex}].maxSlots`}
                                            children={(subField) => (
                                              <div className="flex flex-col gap-3 sm:max-w-[200px]">
                                                <Label className="px-1">
                                                  Max Slots
                                                </Label>
                                                <Input
                                                  type="number"
                                                  min="1"
                                                  className="bg-background"
                                                  value={subField.state.value}
                                                  onChange={(e) =>
                                                    subField.handleChange(
                                                      Number(e.target.value),
                                                    )
                                                  }
                                                />
                                              </div>
                                            )}
                                          />
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                            />
                          </div>
                        ),
                      )}
                    </div>
                  )}
                />
              </FormSection>
            ) : null
          }
        />
      </div>
    );
  },
});
