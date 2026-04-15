import { formOptions } from "@tanstack/react-form";
import { ServiceStatus, type ServiceStatusType } from "@convex/constants";

export interface AddServiceFormValues {
  name: string;
  description: string;
  serviceCategory: "WORKSHOP" | "FABRICATION";
  pricing:
    | { type: "FIXED"; amount: number; upAmount?: number }
    | {
        type: "PER_UNIT";
        baseFee: number;
        upBaseFee?: number;
        unitName: string;
        ratePerUnit: number;
        upRatePerUnit?: number;
      }
    | {
        type: "COMPOSITE";
        baseFee: number;
        upBaseFee?: number;
        unitName: string;
        timeRate: number;
        upTimeRate?: number;
      };
  status: ServiceStatusType;
  images: string[];
  samples: string[];
  requirements: string[];
  fileTypes: string[];
  resources: string[];
  materials: string[];
  availableDays: number[];
  date?: number;
  timeSlots?: { startTime: number; endTime: number; maxSlots: number }[];
}

export const defaultAddServiceValues: AddServiceFormValues = {
  name: "",
  description: "",
  serviceCategory: "WORKSHOP",
  pricing: { type: "FIXED", amount: 0 },
  status: ServiceStatus.AVAILABLE,
  images: [],
  samples: [],
  requirements: [""],
  fileTypes: [],
  resources: [],
  materials: [],
  availableDays: [],
  timeSlots: [],
};

export const addServiceFormOpts = formOptions({
  defaultValues: defaultAddServiceValues,
});
