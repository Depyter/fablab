/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroupChoiceCard } from "./select-option-form";
import { Textarea } from "../ui/textarea";
import { FileUpload } from "../file-upload";
import { DateTimePicker } from "./date-time-picker";
import { toast } from "sonner";

export function Step2ProjectDetails({
  form,
  serviceName,
  expandedFileTypes,
  is3DPrinting,
  isUploading,
  onUploadingChange,
  onPrev,
  onNext,
  requirements,
  availableDays,
  serviceMaterials,
  hasUpPricing,
  serviceCategory,
  schedules,
}: {
  form: any;
  serviceName: string;
  expandedFileTypes: string[];
  is3DPrinting: boolean;
  isUploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onPrev: () => void;
  onNext: (e: React.FormEvent) => void;
  requirements: string[];
  availableDays: number[];
  serviceMaterials: Array<{
    _id: string;
    name: string;
    pricePerUnit?: number;
    costPerUnit?: number;
    unit?: string;
  }>;
  hasUpPricing: boolean;
  serviceCategory?: string;
  schedules?: Array<{
    date: number;
    timeSlots: Array<{
      startTime: number;
      endTime: number;
      maxSlots: number;
    }>;
  }>;
}) {
  const getLocalTimeString = (dateNum: number) => {
    const d = new Date(dateNum);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    const dateTime = form.state.values.dateTime;

    if (!dateTime || !dateTime.date) {
      toast.error("Please select a valid date for your booking.");
      return;
    }

    if (!dateTime.startTime || !dateTime.endTime) {
      toast.error("Please select a start and end time for your booking.");
      return;
    }

    const [startHours, startMinutes] = dateTime.startTime
      .split(":")
      .map(Number);
    const [endHours, endMinutes] = dateTime.endTime.split(":").map(Number);

    const startDate = new Date(dateTime.date);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(dateTime.date);
    endDate.setHours(endHours, endMinutes, 0, 0);

    if (serviceCategory !== "WORKSHOP" && startDate.getTime() < Date.now()) {
      toast.error("Cannot book a date or time in the past.");
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      toast.error("End time must be after start time.");
      return;
    }

    onNext(e);
  };

  return (
    <form
      onSubmit={handleNext}
      className="flex flex-col h-full max-h-[80vh] sm:w-2xl"
    >
      <DialogHeader className="shrink-0 pb-4">
        <DialogTitle className="text-2xl font-extrabold">
          Book {serviceName}
        </DialogTitle>
        <DialogDescription>
          Provide necessary information for your project request.
        </DialogDescription>
      </DialogHeader>

      <Card className="border border-gray-200 bg-gray-50 rounded-lg">
        <CardContent className="pt-2 pb-2">
          <div className="flex flex-col gap-2 text-gray-500">
            <p className="font-semibold text-gray-700">File Guidelines</p>
            {requirements.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                {requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">
                No strict requirements listed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="-mx-4 flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
        <FieldGroup>
          <div className="flex flex-col gap-2 mb-2">
            <Label className="font-bold text-lg">Project Details</Label>
            <p className="text-sm text-muted-foreground">
              Tell us about your project.
            </p>
          </div>

          <form.Field
            name="name"
            children={(field: any) => (
              <Field>
                <Label htmlFor="name-1">Project Name</Label>
                <Input
                  id="name-1"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  className="rounded-lg"
                  placeholder="e.g. Custom Cup"
                />
              </Field>
            )}
          />

          <form.Field
            name="description"
            children={(field: any) => (
              <Field>
                <Label htmlFor="description-1">Project Description</Label>
                <Textarea
                  id="description-1"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  className="rounded-lg resize-none h-24"
                  placeholder="Describe your project, intended use, or specific details..."
                />
              </Field>
            )}
          />

          <form.Field
            name="notes"
            children={(field: any) => (
              <Field>
                <Label htmlFor="notes-1">Special Requirements or Notes</Label>
                <Textarea
                  id="notes-1"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="rounded-lg resize-none h-16"
                  placeholder="Color preferences, dimensional tolerances..."
                />
              </Field>
            )}
          />

          {hasUpPricing && (
            <form.Field
              name="pricing"
              children={(field: any) => (
                <Field>
                  <Label htmlFor="pricing-tier">Pricing Tier</Label>
                  <Select
                    value={field.state.value as string}
                    onValueChange={(val) =>
                      field.handleChange(val as "normal" | "UP")
                    }
                    required
                  >
                    <SelectTrigger
                      id="pricing-tier"
                      className="w-full bg-background border-input"
                    >
                      <SelectValue placeholder="Select Pricing Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Pricing</SelectItem>
                      <SelectItem value="UP">
                        UP Constituent / Affiliated
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          )}

          <form.Field
            name="material"
            children={(field: any) => (
              <Field>
                <Label htmlFor="material-1">Material Preference</Label>
                <RadioGroupChoiceCard
                  value={field.state.value}
                  disableBuyFromLab={serviceMaterials.length === 0}
                  onValueChange={(val) =>
                    field.handleChange(val as "provide-own" | "buy-from-lab")
                  }
                />
              </Field>
            )}
          />

          <form.Subscribe
            selector={(state: any) => state.values.material}
            children={(material: string) =>
              material === "buy-from-lab" &&
              serviceMaterials.length > 0 && (
                <form.Field
                  name="requestedMaterialId"
                  children={(field: any) => (
                    <Field>
                      <Label htmlFor="requestedMaterialId">
                        Select Lab Material
                      </Label>
                      <div className="relative">
                        <Select
                          value={field.state.value || ""}
                          onValueChange={field.handleChange}
                        >
                          <SelectTrigger
                            id="requestedMaterialId"
                            className="w-full bg-background border-input"
                          >
                            <SelectValue placeholder="Select a material..." />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceMaterials.map((m) => (
                              <SelectItem key={m._id} value={m._id}>
                                {m.name} - ₱
                                {m.pricePerUnit || m.costPerUnit || 0}/{m.unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input
                          type="text"
                          required
                          value={field.state.value || ""}
                          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                          tabIndex={-1}
                          onChange={() => {}}
                        />
                      </div>
                    </Field>
                  )}
                />
              )
            }
          />

          <FieldSeparator className="my-2" />

          <form.Field
            name="dateTime"
            children={(field: any) => (
              <>
                {serviceCategory === "WORKSHOP" ? (
                  <>
                    <div className="flex flex-col gap-1 mb-2">
                      <Label className="font-bold text-lg">
                        Select Workshop Time Slot
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Choose an available slot for this workshop.
                      </p>
                    </div>
                    <div className="flex flex-col gap-6">
                      {(schedules || []).map((schedule, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                          <h4 className="font-semibold text-gray-900">
                            {new Date(schedule.date).toLocaleDateString([], {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(schedule.timeSlots || []).map((slot, idx) => {
                              const startFormatted = getLocalTimeString(
                                slot.startTime,
                              );
                              const endFormatted = getLocalTimeString(
                                slot.endTime,
                              );

                              const isSelected =
                                field.state.value?.date?.getTime() ===
                                  new Date(schedule.date).getTime() &&
                                field.state.value?.startTime ===
                                  startFormatted &&
                                field.state.value?.endTime === endFormatted;

                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    field.handleChange({
                                      date: new Date(schedule.date),
                                      startTime: startFormatted,
                                      endTime: endFormatted,
                                    });
                                  }}
                                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-gray-200 bg-white hover:border-primary/50"
                                  }`}
                                >
                                  <p className="font-medium text-sm text-gray-900">
                                    {new Date(
                                      slot.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    -{" "}
                                    {new Date(slot.endTime).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Max capacity: {slot.maxSlots}
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
                ) : is3DPrinting ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="font-bold text-lg">Deadline</Label>
                      <p className="text-sm text-muted-foreground">
                        Set the deadline of your project.
                      </p>
                    </div>
                    <DateTimePicker
                      value={field.state.value as any}
                      onChange={field.handleChange as any}
                      availableDays={availableDays}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="font-bold text-lg">
                        Booking Date & Time
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Set the date and time for your booking.
                      </p>
                    </div>
                    <DateTimePicker
                      value={field.state.value as any}
                      onChange={field.handleChange as any}
                      availableDays={availableDays}
                    />
                  </>
                )}
              </>
            )}
          />

          <FieldSeparator className="my-2" />

          <form.Field
            name="files"
            children={(field: any) => (
              <FileUpload
                title="Upload Your Files"
                value={field.state.value as any}
                onFilesChange={field.handleChange as any}
                onUploadingChange={onUploadingChange}
                accept="*/*"
                allowedTypes={expandedFileTypes as any}
              />
            )}
          />
        </FieldGroup>
      </div>

      <div className="shrink-0 pt-6 border-t mt-4 flex items-center justify-end gap-2">
        {serviceCategory !== "WORKSHOP" && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            className="rounded-lg pl-3"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <Button type="submit" className="rounded-lg" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Review & Estimate"}
        </Button>
      </div>
    </form>
  );
}
