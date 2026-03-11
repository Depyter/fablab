import { formOptions } from "@tanstack/react-form";

export interface AddServiceFormValues {
  name: string;
  description: string;
  regularPrice: number;
  upPrice: number;
  unitPrice: string;
  status: "Available" | "Unavailable";
  images: string[];
  samples: string[];
  requirements: string[];
}

const defaultAddServiceValues: AddServiceFormValues = {
  name: "",
  description: "",
  regularPrice: 0,
  upPrice: 0,
  unitPrice: "",
  status: "Available",
  images: [],
  samples: [],
  requirements: [""],
};

export const addServiceFormOpts = formOptions({
  defaultValues: defaultAddServiceValues,
});
