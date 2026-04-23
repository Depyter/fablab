/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { WorkshopSchedule } from "./workshop-time-slot-picker";
import posthog from "posthog-js";
import { type UploadedFile } from "../file-upload/types";

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
  pricingVariants = [],
  serviceCategory,
  schedules,
  bookedTimeBlocks,
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
  pricingVariants?: Array<{ name: string }>;
  serviceCategory?: string;
  schedules?: WorkshopSchedule[];
  bookedTimeBlocks?: { start: string; end: string }[];
}) {
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

    const [startH, startM] = dateTime.startTime.split(":");
    const [endH, endM] = dateTime.endTime.split(":");

    let startDateTs = 0;
    let endDateTs = 0;

    if (dateTime.originalStartTime && dateTime.originalEndTime) {
      startDateTs = dateTime.originalStartTime;
      endDateTs = dateTime.originalEndTime;
    } else {
      const year = dateTime.date.getFullYear();
      const month = dateTime.date.getMonth() + 1;
      const day = dateTime.date.getDate();
      const dateString = `${month}/${day}/${year}`;

      const startDate = new Date(
        `${dateString} ${startH}:${startM}:00 GMT+0800`,
      );
      startDateTs = startDate.getTime();

      const endDate = new Date(`${dateString} ${endH}:${endM}:00 GMT+0800`);
      endDateTs = endDate.getTime();
    }

    if (serviceCategory !== "WORKSHOP" && startDateTs < Date.now()) {
      toast.error("Cannot book a date or time in the past.");
      return;
    }

    if (endDateTs <= startDateTs) {
      toast.error("End time must be after start time.");
      return;
    }

    console.log("=== DEBUG: Step 2 Form Submission ===");
    console.log("Raw form.state.values.dateTime:", dateTime);
    console.log(
      "Parsed Time Strings - Start:",
      startH,
      startM,
      "End:",
      endH,
      endM,
    );
    console.log(
      "Computed startDateTs:",
      startDateTs,
      new Date(startDateTs).toString(),
    );
    console.log(
      "Computed endDateTs:",
      endDateTs,
      new Date(endDateTs).toString(),
    );
    console.log("Date.now() reference:", Date.now(), new Date().toString());
    console.log(
      "Comparison (startDateTs < Date.now()):",
      startDateTs < Date.now(),
    );
    console.log("=====================================");

    posthog.capture("booking_details_completed", {
      service_name: serviceName,
      service_category: serviceCategory,
      file_count: (form.state.values.files as UploadedFile[]).length,
    });

    onNext(e);
  };

  return (
    <form onSubmit={handleNext} className="flex flex-col h-full min-h-0">
      <DialogHeader className="shrink-0 pb-4">
        <DialogTitle className="text-2xl font-extrabold">
          Book {serviceName}
        </DialogTitle>
        <DialogDescription>
          Provide necessary information for your project request.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 text-gray-500 mb-4">
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

      <div className="-mx-4 flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
        <FieldGroup>
          <div className="flex flex-col gap-2 mb-2">
            <Label className="font-bold text-lg">
              {serviceCategory === "WORKSHOP"
                ? "Booking Details"
                : "Project Details"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {serviceCategory === "WORKSHOP"
                ? "Tell us more about your booking."
                : "Tell us about your project."}
            </p>
          </div>

          {serviceCategory !== "WORKSHOP" && (
            <>
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
                      className="rounded-lg resize-none h-20 md:h-32"
                      placeholder="Describe your project, intended use, or specific details..."
                    />
                  </Field>
                )}
              />
            </>
          )}

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
                  className="rounded-lg resize-none h-12 md:h-24"
                  placeholder="Color preferences, dimensional tolerances..."
                />
              </Field>
            )}
          />

          {hasUpPricing && pricingVariants.length > 0 && (
            <form.Field
              name="pricing"
              children={(field: any) => (
                <Field>
                  <Label htmlFor="pricing-tier">Pricing Tier</Label>
                  <Select
                    value={field.state.value as string}
                    onValueChange={(val) => field.handleChange(val)}
                    required
                  >
                    <SelectTrigger
                      id="pricing-tier"
                      className="w-full bg-background border-input"
                    >
                      <SelectValue placeholder="Select Pricing Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Default">Default Pricing</SelectItem>
                      {pricingVariants.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          )}

          {serviceCategory !== "WORKSHOP" && (
            <>
              <form.Field
                name="material"
                children={(field: any) => (
                  <Field>
                    <Label htmlFor="material-1">Material Preference</Label>
                    <RadioGroupChoiceCard
                      value={field.state.value}
                      disableBuyFromLab={serviceMaterials.length === 0}
                      onValueChange={(val) =>
                        field.handleChange(
                          val as "provide-own" | "buy-from-lab",
                        )
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
                      name="requestedMaterialIds"
                      children={(field: any) => {
                        const selected: string[] = field.state.value ?? [];
                        return (
                          <Field>
                            <Label htmlFor="requestedMaterialIds">
                              Select Lab Materials
                            </Label>
                            <div className="flex flex-col gap-2 rounded-lg border border-input bg-background p-3">
                              {serviceMaterials.map((m) => {
                                const isChecked = selected.includes(m._id);
                                return (
                                  <label
                                    key={m._id}
                                    className="flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          field.handleChange([
                                            ...selected,
                                            m._id,
                                          ]);
                                        } else {
                                          field.handleChange(
                                            selected.filter(
                                              (id) => id !== m._id,
                                            ),
                                          );
                                        }
                                      }}
                                      className="h-4 w-4 rounded border-input accent-primary"
                                    />
                                    <span className="text-sm flex-1">
                                      {m.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      ₱{m.pricePerUnit ?? m.costPerUnit ?? 0}/
                                      {m.unit}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            <input
                              type="text"
                              required
                              value={selected.join(",")}
                              className="absolute opacity-0 pointer-events-none"
                              tabIndex={-1}
                              onChange={() => {}}
                            />
                          </Field>
                        );
                      }}
                    />
                  )
                }
              />
            </>
          )}

          <FieldSeparator className="my-2" />

          <form.AppField
            name="dateTime"
            children={(field: any) => (
              <>
                {serviceCategory === "WORKSHOP" ? (
                  <field.WorkshopTimeSlotPicker schedules={schedules} />
                ) : is3DPrinting ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="font-bold text-lg">
                        Deadline (PST)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Set the deadline of your project. All dates and times
                        are in Philippine Standard Time (PST).
                      </p>
                    </div>
                    <DateTimePicker
                      value={field.state.value as any}
                      onChange={field.handleChange as any}
                      availableDays={availableDays}
                      bookedTimeBlocks={bookedTimeBlocks}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="font-bold text-lg">
                        Booking Date & Time (PST)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Set the date and time for your booking. All dates and
                        times are in Philippine Standard Time (PST).
                      </p>
                    </div>
                    <DateTimePicker
                      value={field.state.value as any}
                      onChange={field.handleChange as any}
                      availableDays={availableDays}
                      bookedTimeBlocks={bookedTimeBlocks}
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
                onUploadComplete={(file: UploadedFile) => {
                  posthog.capture("booking_file_uploaded", {
                    service_name: serviceName,
                    service_category: serviceCategory,
                    file_name: file.fileName,
                    file_type: file.fileType,
                    file_size_bytes: file.fileSize,
                  });
                }}
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
