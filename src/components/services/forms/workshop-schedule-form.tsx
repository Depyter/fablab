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
                description="Configure dates and time slots for this workshop."
              >
                <form.Field
                  name="date"
                  children={(field) => (
                    <div className="space-y-2 flex flex-col">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.state.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.state.value ? (
                              format(new Date(field.state.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.state.value
                                ? new Date(field.state.value)
                                : undefined
                            }
                            onSelect={(date) =>
                              field.handleChange(
                                date ? date.getTime() : undefined,
                              )
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                />

                <form.Field
                  name="timeSlots"
                  mode="array"
                  children={(field) => (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <Label>Time Slots</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            field.pushValue({
                              startTime: 0,
                              endTime: 0,
                              maxSlots: 1,
                            })
                          }
                        >
                          Add Slot
                        </Button>
                      </div>
                      {(field.state.value || []).map((_, index) => (
                        <div
                          key={index}
                          className="flex items-end gap-3 p-4 border rounded-md bg-muted/30"
                        >
                          <form.Field
                            name={`timeSlots[${index}].startTime`}
                            children={(subField) => (
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs text-muted-foreground">
                                  Start Time
                                </Label>
                                <Input
                                  type="time"
                                  value={
                                    subField.state.value
                                      ? new Date(subField.state.value)
                                          .toISOString()
                                          .substring(11, 16)
                                      : ""
                                  }
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    const [h, m] = e.target.value.split(":");
                                    const d = new Date();
                                    d.setHours(Number(h), Number(m), 0, 0);
                                    subField.handleChange(d.getTime());
                                  }}
                                />
                              </div>
                            )}
                          />
                          <form.Field
                            name={`timeSlots[${index}].endTime`}
                            children={(subField) => (
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs text-muted-foreground">
                                  End Time
                                </Label>
                                <Input
                                  type="time"
                                  value={
                                    subField.state.value
                                      ? new Date(subField.state.value)
                                          .toISOString()
                                          .substring(11, 16)
                                      : ""
                                  }
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    const [h, m] = e.target.value.split(":");
                                    const d = new Date();
                                    d.setHours(Number(h), Number(m), 0, 0);
                                    subField.handleChange(d.getTime());
                                  }}
                                />
                              </div>
                            )}
                          />
                          <form.Field
                            name={`timeSlots[${index}].maxSlots`}
                            children={(subField) => (
                              <div className="space-y-1 w-24">
                                <Label className="text-xs text-muted-foreground">
                                  Max Slots
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => field.removeValue(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
