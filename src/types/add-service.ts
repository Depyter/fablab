import { formOptions } from "@tanstack/react-form";
import { ServiceStatus, type ServiceStatusType } from "@convex/constants";

export type PricingVariant =
  | { name: string; amount: number } // FIXED variant
  | { name: string; setupFee: number; ratePerUnit: number } // PER_UNIT variant
  | { name: string; setupFee: number; timeRate: number }; // COMPOSITE variant

export interface AddServiceFormValues {
  name: string;
  description: string;
  serviceCategory: "WORKSHOP" | "FABRICATION";
  pricing:
    | {
        type: "FIXED";
        amount: number;
        variants: Array<{ name: string; amount: number }>;
      }
    | {
        type: "PER_UNIT";
        setupFee: number;
        unitName: "minute" | "hour" | "day";
        ratePerUnit: number;
        variants: Array<{
          name: string;
          setupFee: number;
          ratePerUnit: number;
        }>;
      }
    | {
        type: "COMPOSITE";
        setupFee: number;
        unitName: "minute" | "hour" | "day";
        timeRate: number;
        variants: Array<{ name: string; setupFee: number; timeRate: number }>;
      };
  status: ServiceStatusType;
  images: string[];
  samples: string[];
  requirements: string[];
  fileTypes: string[];
  resources: string[];
  materials: string[];
  availableDays: number[];
  schedules?: {
    date: number;
    timeSlots: { startTime: number; endTime: number; maxSlots: number }[];
  }[];
}

export const defaultAddServiceValues: AddServiceFormValues = {
  name: "",
  description: "",
  serviceCategory: "WORKSHOP",
  pricing: { type: "FIXED" as const, amount: 0, variants: [] },
  status: ServiceStatus.AVAILABLE,
  images: [],
  samples: [],
  requirements: [""],
  fileTypes: [],
  resources: [],
  materials: [],
  availableDays: [],
  schedules: [],
};

export const addServiceFormOpts = formOptions({
  defaultValues: defaultAddServiceValues,
});
