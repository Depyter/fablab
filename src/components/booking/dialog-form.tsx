import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Card, CardContent } from "@/components/ui/card";

import { InfoIcon, ChevronLeft } from "lucide-react";

import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroupChoiceCard } from "./select-option-form";
import { Textarea } from "../ui/textarea";
import { FileUpload } from "../file-upload";
import { useState } from "react";
import { EstimateProjectDetails } from "./estimate-dialog";
import { ActionDialog } from "../action-dialog";
import { DateTimePicker } from "./date-time-picker";

interface BookingDialog {
  serviceName: string;
  requirements: string[];
}

type Step = 1 | 2 | 3;
type ServiceType = "self-service" | "full-service";

export function BookingDialog({ serviceName, requirements }: BookingDialog) {
  const [step, setStep] = useState<Step>(1);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
        setServiceType(null);
      }, 300);
    }
  };

  const handleConfirmCancel = () => {
    handleOpenChange(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
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
                className="p-6 flex flex-col items-center justify-center text-center hover:bg-primary-muted hover:border border-primary cursor-pointer"
                onClick={() => {
                  setServiceType("self-service");
                  handleNextStep();
                }}
              >
                <h3 className="text-lg font-semibold mb-2">Self-Service</h3>
                <p className="text-sm text-gray-600">
                  I will operate the machine myself.
                </p>
              </Card>
              <Card
                className="p-6 flex flex-col items-center justify-center text-center hover:bg-primary-muted hover:border border-primary cursor-pointer"
                onClick={() => {
                  setServiceType("full-service");
                  handleNextStep();
                }}
              >
                <h3 className="text-lg font-semibold mb-2">
                  Full-Service Request
                </h3>
                <p className="text-sm text-gray-600">
                  I need a maker to execute the project for me.
                </p>
              </Card>
            </div>
          </>
        );
      case 2:
        return (
          <form onSubmit={handleNextStep}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold">
                Book {serviceName}
              </DialogTitle>
              <DialogDescription>
                Provide necessary information for your project request.
              </DialogDescription>
            </DialogHeader>
            <FieldSeparator className="mb-2 mt-4" />
            <div className="-mx-4 no-scrollbar max-h-[60vh] overflow-y-auto px-4 py-4">
              <FieldGroup>
                <div className="flex flex-col gap-2">
                  <Label className="font-bold text-lg">Project Details</Label>
                  <p>Tell us about your project.</p>
                </div>

                <Field>
                  <Label htmlFor="name-1">Project Name</Label>
                  <Input
                    id="name-1"
                    name="name"
                    defaultValue=""
                    aria-required="true"
                    className="rounded-lg"
                    placeholder="e.g. Custom Cup"
                  />
                </Field>
                <Field>
                  <Label htmlFor="description-1">Project Description</Label>
                  <Textarea
                    id="description-1"
                    name="username"
                    defaultValue=""
                    aria-required="true"
                    className="rounded-lg"
                    placeholder="Describe your project, intended use, or any specific details..."
                  />
                </Field>

                <FieldSeparator />

                <Field>
                  <Label htmlFor="notes-1">Special Requirements or Notes</Label>
                  <Textarea
                    id="notes-1"
                    name="username"
                    defaultValue=""
                    aria-required="false"
                    className="rounded-lg"
                    placeholder="Color preferences, finish requirements, dimensional tolerances..."
                  />
                </Field>
                <Field>
                  <Label htmlFor="material-1">Material Preference</Label>
                  <RadioGroupChoiceCard />
                </Field>

                <FieldSeparator />

                {is3DPrinting ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label className="font-bold text-lg">Deadline</Label>
                      <p>Set deadline of your project.</p>
                    </div>
                    <DateTimePicker />
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label className="font-bold text-lg">
                        Booking Date & Time
                      </Label>
                      <p>Set the date and time for your booking.</p>
                    </div>
                    <DateTimePicker />
                  </>
                )}

                {/* <Card className="border border-chart-6 bg-secondary-muted rounded-lg">
                  <CardContent>
                    <div className="flex flex-col gap-2 text-chart-6">
                      <div className="flex flex-row items-center gap-2">
                        <InfoIcon/>
                        <p className="">Requirements for this service:</p>
                      </div>
                      {requirements.length > 0 ? (
                      <ul className="list-disc list-insidetext-sm space-y-2 mx-8">
                        {requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        No requirements listed.
                      </p>
                    )}
                    </div>
                  </CardContent>
                </Card> */}

                <FieldSeparator />

                <FileUpload title="Upload Your Files" />

                <Card className="border border-gray-200 bg-gray-50 rounded-lg">
                  <CardContent>
                    <div className="flex flex-col gap-2 text-gray-500">
                      <div className="flex flex-row items-center gap-2">
                        <p className="">File Guidelines</p>
                      </div>
                      {requirements.length > 0 ? (
                        <ul className="list-disc list-insidetext-sm space-y-2 mx-4">
                          {requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400 text-sm">
                          No requirements listed.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </FieldGroup>
            </div>
            <FieldSeparator className="mb-4 mt-2" />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="rounded-lg"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button type="submit" className="rounded-lg">
                Review & Estimate
              </Button>
            </DialogFooter>
          </form>
        );
      case 3:
        return (
          <EstimateProjectDetails
            serviceName={serviceName}
            onBack={handlePrevStep}
          />
        );
      default:
        return null;
    }
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

      <DialogContent className="sm:max-w-2xl sm:max-h-2xl rounded-xl">
        {renderStepContent()}
        {step !== 1 && (
          <div className="absolute bottom-6 left-4">
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
