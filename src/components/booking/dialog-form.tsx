import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EstimateProjectDetails, BookingFormValues } from "./estimate-dialog";
import { Step1ServiceType } from "./step-1-service-type";
import { Step2ProjectDetails } from "./step-2-project-details";
import { ActionDialog } from "../action-dialog";
import { toast } from "sonner";
import { useAppForm } from "@/lib/form-context";
import { useStore } from "@tanstack/react-form";
import { UploadedFile } from "../file-upload/types";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { FILE_CATEGORIES } from "@convex/constants";
import { WorkshopSchedule } from "./workshop-time-slot-picker";

interface BookingDialog {
  serviceId: Id<"services">;
  serviceName: string;
  requirements: string[];
  fileTypes?: string[];
  availableDays?: number[];
  serviceMaterials?: Array<{
    _id: string;
    name: string;
    pricePerUnit?: number;
    costPerUnit?: number;
    unit?: string;
  }>;
  hasUpPricing?: boolean;
  pricingVariants?: Array<{ name: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  servicePricing?: any;
  serviceCategory?: string;
  schedules?: WorkshopSchedule[];
}

type Step = 1 | 2 | 3;

interface LocalBookingFormValues extends Omit<
  BookingFormValues,
  "files" | "material"
> {
  files: UploadedFile[];
  material: "provide-own" | "buy-from-lab";
  requestedMaterialId?: string;
}

export function BookingDialog({
  serviceId,
  serviceName,
  requirements,
  fileTypes = [],
  availableDays = [],
  serviceMaterials = [],
  hasUpPricing = false,
  pricingVariants = [] as Array<{ name: string }>,
  servicePricing,
  serviceCategory,
  schedules,
}: BookingDialog) {
  const expandedFileTypes = fileTypes.flatMap(
    (cat) => FILE_CATEGORIES[cat] || [cat],
  );
  const router = useRouter();
  const [step, setStep] = useState<Step>(
    serviceCategory === "WORKSHOP" ? 2 : 1,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const createProject = useMutation(api.projects.mutate.createProject);

  const handleUploadingChange = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
  }, []);

  const form = useAppForm({
    defaultValues: {
      serviceType: serviceCategory === "WORKSHOP" ? "workshop" : "self-service",
      name: "",
      description: "",
      notes: "",
      material: "provide-own",
      pricing: "Default",
      requestedMaterialId: undefined,
      dateTime: {
        date: undefined,
        startTime: "",
        endTime: "",
        originalDate: undefined,
        originalStartTime: undefined,
        originalEndTime: undefined,
      },
      files: [],
    } as LocalBookingFormValues,
    onSubmit: async ({ value: rawValue }) => {
      const value = rawValue as LocalBookingFormValues;
      if (isSubmitting || isSuccess) return;

      if (!value.dateTime.date) {
        toast.error("Please select a date.");
        return;
      }

      setIsSubmitting(true);
      try {
        const year = value.dateTime.date.getFullYear();
        const month = value.dateTime.date.getMonth() + 1;
        const day = value.dateTime.date.getDate();
        const dateString = `${month}/${day}/${year}`;
        const baseDate = new Date(`${dateString} 00:00:00 GMT+0800`);
        const bookingDateTs = value.dateTime.originalDate ?? baseDate.getTime();

        const [startH, startM] = value.dateTime.startTime.split(":");
        const startDate = new Date(
          `${dateString} ${startH}:${startM}:00 GMT+0800`,
        );
        const startTimeTs = startDate.getTime();

        const [endH, endM] = value.dateTime.endTime.split(":");
        const endDate = new Date(`${dateString} ${endH}:${endM}:00 GMT+0800`);
        const endTimeTs = endDate.getTime();

        console.log("=== DEBUG: dialog-form.tsx onSubmit ===");
        console.log("Raw form value.dateTime:", value.dateTime);
        console.log(
          "Computed bookingDateTs:",
          bookingDateTs,
          new Date(bookingDateTs).toString(),
        );
        console.log(
          "Computed startTimeTs:",
          startTimeTs,
          new Date(startTimeTs).toString(),
        );
        console.log(
          "Computed endTimeTs:",
          endTimeTs,
          new Date(endTimeTs).toString(),
        );
        console.log("Date.now() reference:", Date.now(), new Date().toString());
        console.log(
          "Comparison (startTimeTs < Date.now()):",
          startTimeTs < Date.now(),
        );
        console.log("=====================================");

        if (startTimeTs < Date.now()) {
          toast.error("Cannot book a date or time in the past.");
          setIsSubmitting(false);
          return;
        }

        if (endTimeTs <= startTimeTs) {
          toast.error("End time must be after start time.");
          setIsSubmitting(false);
          return;
        }

        const { roomId, threadId } = await createProject({
          name: value.name || `${serviceName} Booking`,
          description: value.description || `Booking for ${serviceName}`,
          serviceType: value.serviceType,
          material: value.material,
          requestedMaterialId: value.requestedMaterialId as
            | Id<"materials">
            | undefined,
          service: serviceId,
          pricing: value.pricing,
          notes: value.notes,
          files: value.files.map((f) => f.storageId as Id<"_storage">),
          booking: {
            date: bookingDateTs,
            startTime: startTimeTs,
            endTime: endTimeTs,
          },
          ...(serviceCategory === "WORKSHOP"
            ? {
                selectedTimeSlot: {
                  startTime: value.dateTime.originalStartTime ?? startTimeTs,
                  endTime: value.dateTime.originalEndTime ?? endTimeTs,
                },
              }
            : {}),
        });

        setIsSuccess(true);
        toast.success("Booking request created successfully!");
        router.push(`/dashboard/chat/${roomId}?thread=${threadId}`);
      } catch (error) {
        setIsSubmitting(false);
        toast.error(
          error instanceof Error ? error.message : "Failed to create booking.",
        );
      }
    },
  });

  const selectedDateRaw = useStore(
    form.store,
    (state: { values: LocalBookingFormValues }) => state.values.dateTime.date,
  );
  let queryDateTs: number | undefined;
  if (selectedDateRaw) {
    const year = selectedDateRaw.getFullYear();
    const month = selectedDateRaw.getMonth() + 1;
    const day = selectedDateRaw.getDate();
    queryDateTs = new Date(
      `${month}/${day}/${year} 00:00:00 GMT+0800`,
    ).getTime();
  }

  const bookedTimeSlotsRaw = useQuery(
    api.services.query.getBookedTimeSlots,
    queryDateTs ? { serviceId, date: queryDateTs } : "skip",
  );

  const bookedTimeBlocks = (bookedTimeSlotsRaw || []).map(
    (slot: { startTime: number; endTime: number }) => ({
      start: new Date(slot.startTime).toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      end: new Date(slot.endTime).toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
  );

  const is3DPrinting = serviceName.toLowerCase().includes("3d printing");

  const handleNextStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    setStep((prev) => (prev < 3 ? prev + 1 : prev) as Step);
  };

  const handlePrevStep = () => {
    const minStep = serviceCategory === "WORKSHOP" ? 2 : 1;
    if (step > minStep) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state on close
      setTimeout(() => {
        setStep(serviceCategory === "WORKSHOP" ? 2 : 1);
        setIsSubmitting(false);
        setIsSuccess(false);
        form.reset();
      }, 300);
    }
  };

  const handleConfirmCancel = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-primary hover:bg-primary/80 px-10 font-medium rounded-md text-white hover:text-white w-full"
        >
          Create Booking
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col h-auto w-full min-w-[min(22rem,calc(100%-2rem))] md:max-w-[80%] lg:max-w-[60vw] sm:max-w-[min(80vw,80rem)] rounded-xl max-h-[90vh] overflow-hidden">
        {step === 1 && serviceCategory !== "WORKSHOP" && (
          <Step1ServiceType
            form={form}
            onNext={() => {
              if (
                serviceCategory === "FABRICATION" &&
                availableDays.length === 0
              ) {
                toast.error(
                  "This service is currently unavailable for booking.",
                );
                return;
              }
              if (
                serviceCategory === "WORKSHOP" &&
                (!schedules || schedules.length === 0)
              ) {
                toast.error("This workshop has no available schedules.");
                return;
              }
              handleNextStep();
            }}
          />
        )}

        {step === 2 && (
          <Step2ProjectDetails
            form={form}
            serviceName={serviceName}
            expandedFileTypes={expandedFileTypes}
            is3DPrinting={is3DPrinting}
            isUploading={isUploading}
            onUploadingChange={handleUploadingChange}
            onPrev={handlePrevStep}
            onNext={handleNextStep}
            requirements={requirements}
            availableDays={availableDays}
            serviceMaterials={serviceMaterials}
            hasUpPricing={hasUpPricing}
            pricingVariants={pricingVariants}
            serviceCategory={serviceCategory}
            schedules={schedules}
            bookedTimeBlocks={bookedTimeBlocks}
          />
        )}

        {step === 3 && (
          <form
            className="w-full flex flex-col h-full min-h-0"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isSubmitting || isSuccess) return;
              form.handleSubmit();
            }}
          >
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, formIsSubmitting]) => (
                <EstimateProjectDetails
                  serviceName={serviceName}
                  data={{
                    ...form.state.values,
                    files: form.state.values.files,
                  }}
                  servicePricing={servicePricing}
                  serviceMaterials={serviceMaterials}
                  isSubmitting={isSubmitting || formIsSubmitting || isSuccess}
                  canSubmit={canSubmit && !isSuccess}
                  onBack={handlePrevStep}
                />
              )}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
