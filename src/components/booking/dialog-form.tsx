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
import { UploadedFile } from "../file-upload/types";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { FILE_CATEGORIES } from "@convex/constants";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  servicePricing?: any;
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
  servicePricing,
}: BookingDialog) {
  const expandedFileTypes = fileTypes.flatMap(
    (cat) => FILE_CATEGORIES[cat] || [cat],
  );
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createProject = useMutation(api.projects.mutate.createProject);

  const handleUploadingChange = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
  }, []);

  const form = useAppForm({
    defaultValues: {
      serviceType: "self-service",
      name: "",
      description: "",
      notes: "",
      material: "provide-own",
      pricing: "normal",
      requestedMaterialId: undefined,
      dateTime: {
        date: undefined,
        startTime: "",
        endTime: "",
      },
      files: [],
    } as LocalBookingFormValues,
    onSubmit: async ({ value: rawValue }) => {
      const value = rawValue as LocalBookingFormValues;
      if (isSubmitting) return;

      if (!value.dateTime.date) {
        toast.error("Please select a date.");
        return;
      }

      setIsSubmitting(true);
      try {
        const [startHours, startMinutes] = value.dateTime.startTime
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = value.dateTime.endTime
          .split(":")
          .map(Number);

        const startDate = new Date(value.dateTime.date);
        startDate.setHours(startHours, startMinutes, 0, 0);

        const endDate = new Date(value.dateTime.date);
        endDate.setHours(endHours, endMinutes, 0, 0);

        if (startDate.getTime() < Date.now()) {
          toast.error("Cannot book a date or time in the past.");
          setIsSubmitting(false);
          return;
        }

        if (endDate.getTime() <= startDate.getTime()) {
          toast.error("End time must be after start time.");
          setIsSubmitting(false);
          return;
        }

        const { roomId, threadId } = await createProject({
          name: value.name,
          description: value.description,
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
            date: value.dateTime.date.getTime(),
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
          },
        });

        toast.success("Booking request created successfully!");
        router.push(`/dashboard/chat/${roomId}?thread=${threadId}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create booking.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const is3DPrinting = serviceName.toLowerCase().includes("3d printing");

  const handleNextStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    setStep((prev) => (prev < 3 ? prev + 1 : prev) as Step);
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state on close
      setTimeout(() => {
        setStep(1);
        setIsSubmitting(false);
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

      <DialogContent className="h-auto w-auto min-w-[min(22rem,calc(100%-2rem))] max-w-[calc(100%-2rem)] sm:max-w-[min(80vw,80rem)] rounded-xl">
        {step === 1 && (
          <Step1ServiceType
            form={form}
            onNext={() => {
              if (availableDays.length === 0) {
                toast.error(
                  "This service is currently unavailable for booking.",
                );
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
          />
        )}

        {step === 3 && (
          <form
            className="w-full"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isSubmitting) return;
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
                  isSubmitting={isSubmitting || formIsSubmitting}
                  canSubmit={canSubmit}
                  onBack={handlePrevStep}
                />
              )}
            />
          </form>
        )}
        {step !== 1 && (
          <div className="absolute bottom-6 left-4 z-50">
            <ActionDialog
              onConfirm={handleConfirmCancel}
              title="Cancel Project Request?"
              description="Are you sure you want to cancel this request? All progress will be lost."
              baseActionText="Cancel"
              confirmButtonText="Yes, Cancel"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
