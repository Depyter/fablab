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

import { InfoIcon } from "lucide-react";

import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroupChoiceCard } from "./select-option-form";
import { Textarea } from "../ui/textarea";
import { FileUpload } from "../file-upload";
import { useState } from "react";
import { EstimateProjectDetails } from "./estimate-dialog";
import { ActionDialog } from "./action-dialog";

interface BookingDialog {
  serviceName: string;
  requirements: string[];
}

export function BookingDialog({ serviceName, requirements }: BookingDialog) {
  const [isForEstimate, setIsForEstimate] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleEstimate = (e: React.FormEvent) => {
    e.preventDefault();

    setIsForEstimate(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => setIsForEstimate(false), 300);
    }
  };

  const handleConfirmCancel = () => {
    setIsOpen(false); // Close the parent dialog
    setTimeout(() => setIsForEstimate(false), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg text-white hover:text-white w-full"
        >
          Create Booking
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl sm:max-h-2xl rounded-xl">
        {isForEstimate ? (
          <EstimateProjectDetails
            serviceName={serviceName}
            onBack={() => setIsForEstimate(false)}
          />
        ) : (
          <form onSubmit={handleEstimate}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold">
                Book {serviceName}
              </DialogTitle>
              <DialogDescription>
                Provide necessary information for project request.
              </DialogDescription>
            </DialogHeader>
            <FieldSeparator className="mb-2 mt-4" />
            <div className="-mx-4 no-scrollbar max-h-[70vh] overflow-y-auto px-4 py-4">
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
                    placeholder="Describe your project, intended use, or anu specific details..."
                  />
                </Field>
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

                <Card className="border border-chart-6 bg-secondary-muted rounded-lg">
                  <CardContent>
                    <div className="flex flex-col gap-2 text-chart-6">
                      <div className="flex flex-row items-center gap-2">
                        <InfoIcon />
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
                </Card>

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

            <FieldSeparator className="mb-4" />
            <DialogFooter>
              <ActionDialog onConfirm={handleConfirmCancel} />

              <Button type="submit" className="rounded-lg">
                Review & Estimate
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
