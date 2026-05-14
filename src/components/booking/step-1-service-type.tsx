import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import posthog from "posthog-js";

export function Step1ServiceType({
  form,
  serviceName,
  serviceCategory,
  onNext,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  serviceName?: string;
  serviceCategory?: string;
  onNext: () => void;
}) {
  const trackAndNext = (serviceType: string) => {
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
        <DialogDescription className="max-w-xl text-sm text-muted-foreground">
          Select how you&apos;d like to use this service.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 py-8 md:grid-cols-2">
        <Card
          className="cursor-pointer rounded-lg border-4 border-black bg-background p-6 text-center shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-1.5 hover:translate-y-1.5 hover:shadow-none hover:bg-fab-teal/10"
          onClick={() => trackAndNext("self-service")}
        >
          <h3 className="mb-2 text-lg font-black uppercase tracking-tight">
            Self-Service
          </h3>
          <p className="text-sm text-muted-foreground">
            I will operate the machine myself.
          </p>
        </Card>
        <Card
          className="cursor-pointer rounded-lg border-4 border-black bg-background p-6 text-center shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-1.5 hover:translate-y-1.5 hover:shadow-none hover:bg-fab-magenta/10"
          onClick={() => trackAndNext("full-service")}
        >
          <h3 className="mb-2 text-lg font-black uppercase tracking-tight">
            Full-Service Request
          </h3>
          <p className="text-sm text-muted-foreground">
            I need a maker to execute the project for me.
          </p>
        </Card>
      </div>
    </>
  );
}
