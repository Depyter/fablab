import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AppFormApi } from "@/lib/form-context";
import { FulfillmentMode, type FulfillmentModeType } from "@convex/constants";
import posthog from "posthog-js";
import type { BookingDetailsFormValues } from "./step-2-project-details";

export function Step1ServiceType({
  form,
  serviceName,
  serviceCategory,
  onNext,
}: {
  form: AppFormApi<BookingDetailsFormValues>;
  serviceName?: string;
  serviceCategory?: string;
  onNext: () => void;
}) {
  const trackAndNext = (serviceType: FulfillmentModeType) => {
    form.setFieldValue("serviceType", serviceType);
    posthog.capture("booking_service_type_selected", {
      service_name: serviceName,
      service_category: serviceCategory,
      service_type_selected: serviceType,
    });
    onNext();
  };

  return (
    <>
      <DialogHeader className="shrink-0 border-b-4 border-black px-2 pb-4 sm:px-0">
        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
          Choose Service Type
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 py-8 md:grid-cols-2">
        <div
          className="cursor-pointer rounded-none border-4 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] hover:bg-fab-teal/5"
          onClick={() => trackAndNext(FulfillmentMode.SELF_SERVICE)}
        >
          <h3 className="mb-2 text-lg font-black uppercase tracking-tighter">
            Self-Service
          </h3>
          <p className="text-sm font-bold text-black/60">
            I will operate the machine myself.
          </p>
        </div>
        <div
          className="cursor-pointer rounded-none border-4 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] hover:bg-fab-magenta/5"
          onClick={() => trackAndNext(FulfillmentMode.FULL_SERVICE)}
        >
          <h3 className="mb-2 text-lg font-black uppercase tracking-tighter">
            Full-Service Request
          </h3>
          <p className="text-sm font-bold text-black/60">
            I need a maker to execute the project for me.
          </p>
        </div>
      </div>
    </>
  );
}
