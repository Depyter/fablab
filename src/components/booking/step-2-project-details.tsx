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
import { getCurrentTimestamp, getLabTimeRangeTimestamps } from "@/lib/lab-time";
import posthog from "posthog-js";
import { type UploadedFile } from "../file-upload/types";

type PricingVariantOption = { name: string };

const EMPTY_PRICING_VARIANTS: PricingVariantOption[] = [];

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
  pricingVariants = EMPTY_PRICING_VARIANTS,
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
  pricingVariants?: PricingVariantOption[];
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
      const labRange = getLabTimeRangeTimestamps({
        date: dateTime.date,
        startTime: `${startH}:${startM}`,
        endTime: `${endH}:${endM}`,
      });
      startDateTs = labRange.startTime;
      endDateTs = labRange.endTime;
    }

    if (serviceCategory !== "WORKSHOP" && startDateTs < getCurrentTimestamp()) {
      toast.error("Cannot book a date or time in the past.");
      return;
    }

    if (endDateTs <= startDateTs) {
      toast.error("End time must be after start time.");
      return;
    }

    posthog.capture("booking_details_completed", {
      service_name: serviceName,
      service_category: serviceCategory,
      file_count: (form.state.values.files as UploadedFile[]).length,
    });

    onNext(e);
  };

  return (
    <form onSubmit={handleNext} className="flex flex-col h-full min-h-0">
      <DialogHeader className="shrink-0 px-2 pb-4 sm:px-0">
        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
          Book {serviceName}
        </DialogTitle>
        <DialogDescription className="max-w-xl text-sm text-muted-foreground">
          Provide necessary information for your project request.
        </DialogDescription>
      </DialogHeader>

      <div className="mb-4 border-2 border-black bg-fab-teal/10 p-4 shadow-[4px_4px_0_0_#000] text-gray-500">
        <p className="font-black uppercase tracking-[0.25em] text-gray-900">File Guidelines</p>
        {requirements.length > 0 ? (
          <ul className="list-disc list-inside text-sm space-y-1 ml-2">
            {requirements.map((req, i) => (
              <li
                key={`${req}-${
                  requirements.slice(0, i).filter((item) => item === req).length
                }`}
              >
                {req}
              </li>
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
                    <Label htmlFor="name-1" className="font-black uppercase tracking-[0.2em] text-xs">Project Name</Label>
                    <Input
                      id="name-1"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      className="rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000] focus-visible:ring-0"
                      placeholder="e.g. Custom Cup"
                    />
                  </Field>
                )}
              />

              <form.Field
                name="description"
                children={(field: any) => (
                  <Field>
                    <Label htmlFor="description-1" className="font-black uppercase tracking-[0.2em] text-xs">Project Description</Label>
                    <Textarea
                      id="description-1"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      className="min-h-20 resize-none rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000] focus-visible:ring-0 md:min-h-32"
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
                <Label htmlFor="notes-1" className="font-black uppercase tracking-[0.2em] text-xs">Special Requirements or Notes</Label>
                <Textarea
                  id="notes-1"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="min-h-12 resize-none rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000] focus-visible:ring-0 md:min-h-24"
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
                  <Label htmlFor="pricing-tier" className="font-black uppercase tracking-[0.2em] text-xs">Pricing Tier</Label>
                  <Select
                    value={field.state.value as string}
                    onValueChange={(val) => field.handleChange(val)}
                    required
                  >
                    <SelectTrigger
                      id="pricing-tier"
                      className="w-full rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000]"
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
                    <Label htmlFor="material-1" className="font-black uppercase tracking-[0.2em] text-xs">Material Preference</Label>
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
                            <Label htmlFor="requestedMaterialIds" className="font-black uppercase tracking-[0.2em] text-xs">
                              Select Lab Materials
                            </Label>
                            <div className="flex flex-col gap-2 rounded-lg border-2 border-black bg-background p-3 shadow-[4px_4px_0_0_#000]">
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

      <div className="shrink-0 mt-4 flex items-center justify-end gap-2 border-t-4 border-black pt-6">
        {serviceCategory !== "WORKSHOP" && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            className="rounded-none border-2 border-black bg-background pl-3 shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <Button type="submit" className="rounded-none border-2 border-black bg-fab-magenta text-white shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-fab-teal" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Review & Estimate"}
        </Button>
      </div>
    </form>
  );
}
