import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

export function Step1ServiceType({
  form,
  onNext,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  onNext: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-extrabold">
          Choose Service Type
        </DialogTitle>
        <DialogDescription>
          Select how you&apos;d like to use this service.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
        <Card
          className="p-6 flex flex-col items-center justify-center text-center hover:bg-primary-muted/10 hover:border border-primary cursor-pointer"
          onClick={() => {
            form.setFieldValue("serviceType", "self-service");
            onNext();
          }}
        >
          <h3 className="text-lg font-semibold mb-2">Self-Service</h3>
          <p className="text-sm text-gray-600">
            I will operate the machine myself.
          </p>
        </Card>
        <Card
          className="p-6 flex flex-col items-center justify-center text-center hover:bg-primary-muted/10 hover:border border-primary cursor-pointer"
          onClick={() => {
            form.setFieldValue("serviceType", "full-service");
            onNext();
          }}
        >
          <h3 className="text-lg font-semibold mb-2">Full-Service Request</h3>
          <p className="text-sm text-gray-600">
            I need a maker to execute the project for me.
          </p>
        </Card>
      </div>
    </>
  );
}
