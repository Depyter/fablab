"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
// import { AddServiceFromValues } from "@/app/(private)/dashboard/services/add-service/page";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";

interface GeneralInfoFormProps {
  form: any;
  title: string;
  options: { label: string; value: string }[];
  fieldName: string;
}

export function SelectForm({
  form,
  title,
  options,
  fieldName,
}: GeneralInfoFormProps) {
  return (
    <Card className="w-full sm:max-w-md">
      <CardHeader>
        <CardTitle className="font-bold text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <form.Field
            name={fieldName}
            children={(field: any) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <Select
                    name={field.name}
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                    aria-invalid={isInvalid}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue
                        placeholder={`Select ${title.toLowerCase()}...`}
                      />
                      <SelectContent className="w-full ">
                        {options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="focus:bg-chart-2"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectTrigger>
                  </Select>
                  {/* <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter service name..."
                        autoComplete="off"
                    /> */}
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
