import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Card } from "@/components/ui/card";

import { FieldSeparator } from "@/components/ui/field";
import { MediaGallery } from "../chat/media-gallery";
import { UploadedFile } from "../file-upload/types";

export type BookingFormValues = {
  serviceType: "self-service" | "full-service";
  name: string;
  description: string;
  notes: string;
  material: string;
  dateTime: {
    date: Date | undefined;
    startTime: string;
    endTime: string;
  };
  files: UploadedFile[];
};

interface EstimateProjectDetailsProps {
  serviceName: string;
  data: BookingFormValues;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  onBack: () => void;
}

export function EstimateProjectDetails({
  serviceName,
  data,
  isSubmitting,
  canSubmit,
  onBack,
}: EstimateProjectDetailsProps) {
  return (
    <div className="sm:max-w-2xl sm:max-h-2xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-extrabold">
          Review & Estimate Project
        </DialogTitle>
        <DialogDescription>
          Please review all details before submitting.
        </DialogDescription>
      </DialogHeader>

      <FieldSeparator className="mt-4 mb-2" />

      <div className="-mx-4 no-scrollbar max-h-[70vh] overflow-y-auto px-4 py-4">
        <Card className="rounded-lg">
          <div className=" divide-y">
            {/* Service Summary */}
            <div className="p-6 -mt-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                Service Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Service</p>
                  <p className="font-medium">{serviceName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium capitalize">
                    {data.serviceType?.replace("-", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Project Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium">
                    {data.dateTime.date
                      ? data.dateTime.date.toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Time</p>
                  <p className="font-medium">
                    {data.dateTime.startTime} - {data.dateTime.endTime}
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Project Name</p>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Material</p>
                    <p className="font-medium">
                      {data.material === "provide-own"
                        ? "Provide Materials"
                        : "Buy From Fablab"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-600">Description</p>
                  <p className="font-medium">{data.description}</p>
                </div>
                {data.notes && (
                  <div>
                    <p className="text-gray-600">Notes</p>
                    <p className="font-medium">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Files */}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Uploaded Files
              </h3>
              {data.files.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {data.files.map((f, i) => (
                    <MediaGallery
                      key={i}
                      mediaFiles={[
                        {
                          fileUrl: f.url || "",
                          fileType: f.fileType,
                          originalName: f.fileName,
                        },
                      ]}
                      isCurrentUser={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No files uploaded.</p>
              )}
            </div>

            {/* Pricing */}
            <div className="p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-4">
                Pricing Estimate
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price</span>
                  <span className="font-medium">P 0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">0 mins</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold">Estimated Total</span>
                  <span className="font-semibold text-lg text-chart-6">
                    P 0.00
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final price may vary based on actual production time and
                  materials used.
                </p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start p-6">
            <input
              type="checkbox"
              id="terms"
              required
              className="mt-1 h-4 w-4 text-chart-6 rounded"
            />
            <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
              I understand that this is a booking request and requires admin
              approval. I agree to the{" "}
              <a href="#" className="text-chart-6 hover:underline">
                terms and conditions
              </a>{" "}
              and the{" "}
              <a href="#" className="text-chart-6 hover:underline">
                cancellation policy
              </a>
              .
            </label>
          </div>
        </Card>
      </div>

      <FieldSeparator className="mb-4" />
      <DialogFooter>
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>

        <Button
          type="submit"
          className="rounded-lg"
          disabled={isSubmitting || canSubmit === false}
        >
          {isSubmitting ? "Submitting..." : "Submit Project Request"}
        </Button>
      </DialogFooter>
    </div>
  );
}
