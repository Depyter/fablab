import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { EstimateProjectDetails, BookingFormValues } from "./estimate-dialog";
import { Step1ServiceType } from "./step-1-service-type";
import { Step2ProjectDetails } from "./step-2-project-details";
import { toast } from "sonner";
import { useAppForm } from "@/lib/form-context";
import { useStore } from "@tanstack/react-form";
import { UploadedFile } from "../file-upload/types";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  FILE_CATEGORIES,
  FulfillmentMode,
  ProjectMaterial,
} from "@convex/constants";
import { WorkshopSchedule } from "./workshop-time-slot-picker";
import { type ServicePricing } from "@/lib/project-pricing";
import posthog from "posthog-js";

type BookingServiceMaterial = {
  _id: string;
  name: string;
  pricePerUnit?: number;
  costPerUnit?: number;
  unit?: string;
};

type BookingPricingVariant = { name: string };

interface BookingDialog {
  serviceId: Id<"services">;
  serviceName: string;
  requirements: string[];
  fileTypes?: string[];
  availableDays?: number[];
  serviceMaterials?: BookingServiceMaterial[];
  hasUpPricing?: boolean;
  pricingVariants?: BookingPricingVariant[];
  servicePricing?: ServicePricing;
  serviceCategory?: string;
  schedules?: WorkshopSchedule[];
}

type Step = 1 | 2 | 3;

interface LocalBookingFormValues extends Omit<
  BookingFormValues,
  "files" | "material"
> {
  files: UploadedFile[];
  material:
    | typeof ProjectMaterial.PROVIDE_OWN
    | typeof ProjectMaterial.BUY_FROM_LAB;
  requestedMaterialIds: string[];
}

const EMPTY_FILE_TYPES: string[] = [];
const EMPTY_AVAILABLE_DAYS: number[] = [];
const EMPTY_SERVICE_MATERIALS: BookingServiceMaterial[] = [];
const EMPTY_PRICING_VARIANTS: BookingPricingVariant[] = [];

export function BookingDialog({
  serviceId,
  serviceName,
  requirements,
  fileTypes = EMPTY_FILE_TYPES,
  availableDays = EMPTY_AVAILABLE_DAYS,
  serviceMaterials = EMPTY_SERVICE_MATERIALS,
  hasUpPricing = false,
  pricingVariants = EMPTY_PRICING_VARIANTS,
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

  const isUnauthenticatedBookingError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";

    return /unauthenticated|not\s+authenticated/i.test(message);
  };

  const handleUploadingChange = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
  }, []);

  const handleFormSubmit = useCallback(
    async ({ value: rawValue }: { value: LocalBookingFormValues }) => {
      const value = rawValue as LocalBookingFormValues;
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
          fulfillmentMode: value.serviceType,
          material: value.material,
          requestedMaterials: value.requestedMaterialIds as Id<"materials">[],
          service: serviceId,
          pricing: value.pricing,
          notes: value.notes,
          files: value.files.map((f) => f.storageId as Id<"_storage">),
          booking: {
            date: bookingDateTs,
            startTime:
              serviceCategory === "WORKSHOP"
                ? (value.dateTime.originalStartTime ?? startTimeTs)
                : startTimeTs,
            endTime:
              serviceCategory === "WORKSHOP"
                ? (value.dateTime.originalEndTime ?? endTimeTs)
                : endTimeTs,
          },
        });

        posthog.capture("booking_submitted", {
          service_id: serviceId,
          service_name: serviceName,
          service_category: serviceCategory,
          file_count: value.files.length,
        });

        setIsSuccess(true);
        toast.success("Booking request created successfully!");
        router.push(`/dashboard/chat/${roomId}?thread=${threadId}`);
      } catch (error) {
        setIsSubmitting(false);
        if (isUnauthenticatedBookingError(error)) {
          toast.error("You must be logged in to create a booking.");
          setIsOpen(false);
          router.push("/login");
          return;
        }
        toast.error(
          error instanceof Error ? error.message : "Failed to create booking.",
        );
      }
    },
    [serviceCategory, serviceId, serviceName, createProject, router],
  );

  const form = useAppForm({
    defaultValues: {
      serviceType:
        serviceCategory === "WORKSHOP"
          ? FulfillmentMode.STAFF_LED
          : FulfillmentMode.SELF_SERVICE,
      name: "",
      description: "",
      notes: "",
      material: ProjectMaterial.PROVIDE_OWN,
      pricing: "Default",
      requestedMaterialIds: [],
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
    onSubmit: handleFormSubmit,
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

  const handleCreateBookingClick = async () => {
    const session = await authClient.getSession();
    if (!session?.data) {
      toast.error("You must be logged in to create a booking.");
      router.push("/login");
      return;
    }

    posthog.capture("booking_dialog_opened", {
      service_id: serviceId,
      service_name: serviceName,
      service_category: serviceCategory,
    });
    handleOpenChange(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        onClick={handleCreateBookingClick}
        className="w-full rounded-none border-2 border-black bg-fab-magenta px-8 py-6 text-sm font-black uppercase tracking-[0.3em] text-white shadow-[6px_6px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-fab-teal hover:text-white sm:px-10"
      >
        Create Booking
      </Button>

      <DialogContent className="top-0 left-0 flex h-screen max-h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none p-4 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:min-w-[min(22rem,calc(100%-2rem))] sm:max-w-[min(80vw,80rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl md:max-w-[80%] lg:max-w-[60vw]">
        {step === 1 && serviceCategory !== "WORKSHOP" && (
          <Step1ServiceType
            form={form}
            serviceName={serviceName}
            serviceCategory={serviceCategory}
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
