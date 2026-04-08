import { formOptions } from "@tanstack/react-form";
import { ServiceStatus, type ServiceStatusType } from "@convex/constants";

export interface AddServiceFormValues {
  name: string;
  description: string;
  regularPrice: number;
  upPrice: number;
  unitPrice: string;
  status: ServiceStatusType;
  images: string[];
  samples: string[];
  requirements: string[];
  fileTypes: string[];
  resources: string[];
  availableDays: number[];
}

const defaultAddServiceValues: AddServiceFormValues = {
  name: "",
  description: "",
  regularPrice: 0,
  upPrice: 0,
  unitPrice: "",
  status: ServiceStatus.AVAILABLE,
  images: [],
  samples: [],
  requirements: [""],
  fileTypes: [],
  resources: [],
  availableDays: [],
};

export const addServiceFormOpts = formOptions({
  defaultValues: defaultAddServiceValues,
});
