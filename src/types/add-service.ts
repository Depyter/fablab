import { formOptions } from "@tanstack/react-form";
import type { Id } from "@convex/_generated/dataModel";
import { ServiceStatus, type ServiceStatusType } from "@convex/constants";

export type PricingVariant =
  | { name: string; amount: number } // FIXED variant
  | { name: string; setupFee: number; timeRate: number }; // FABRICATION variant

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
        type: "FABRICATION";
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
    timeSlots: {
      startTime: number;
      endTime: number;
      maxSlots: number;
      usedUpSlots?: number;
      resources?: string[];
      availableMaterials?: string[];
    }[];
  }[];
}

export type MutationWorkshopSchedule = {
  date: number;
  timeSlots: Array<{
    startTime: number;
    endTime: number;
    maxSlots: number;
    usedUpSlots?: number;
    resources?: Id<"resources">[];
    availableMaterials?: Id<"materials">[];
  }>;
};

export function toMutationWorkshopSchedules(
  schedules: AddServiceFormValues["schedules"] = [],
): MutationWorkshopSchedule[] {
  return schedules.map((schedule) => ({
    date: schedule.date,
    timeSlots: schedule.timeSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxSlots: slot.maxSlots,
      ...(slot.usedUpSlots === undefined
        ? {}
        : { usedUpSlots: slot.usedUpSlots }),
      ...(slot.resources && slot.resources.length > 0
        ? { resources: slot.resources.map((id) => id as Id<"resources">) }
        : {}),
      ...(slot.availableMaterials && slot.availableMaterials.length > 0
        ? {
            availableMaterials: slot.availableMaterials.map(
              (id) => id as Id<"materials">,
            ),
          }
        : {}),
    })),
  }));
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
