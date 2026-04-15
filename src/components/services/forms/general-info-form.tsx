"use client";

import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FormSection } from "@/components/ui/form-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { label: "Su", value: 0 },
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
];

export const GeneralInfoForm = withForm({
  ...addServiceFormOpts,
  render: function GeneralInfoRender({ form }) {
    return (
      <div className="w-full sm:max-w-3xl">
        <FormSection
          title="General Information"
          description="Provide details about your service."
        >
          <form.AppField
            name="name"
            validators={{
              onSubmit: ({ value }) =>
                !value.trim() ? "Service name is required" : undefined,
            }}
            children={(field) => (
              <field.TextInput
                label="Service Name"
                placeholder="Enter service name..."
              />
            )}
          />

          <form.AppField
            name="description"
            validators={{
              onSubmit: ({ value }) =>
                !value.trim() ? "Description is required" : undefined,
            }}
            children={(field) => (
              <field.TextareaInput
                label="Description"
                placeholder="Description of service..."
                rows={6}
                className="min-h-24 resize-none"
              />
            )}
          />

          <form.Subscribe
            selector={(state) => state.values.serviceCategory}
            children={(serviceCategory) =>
              serviceCategory === "FABRICATION" ? (
                <form.Field
                  name="availableDays"
                  children={(field) => (
                    <Field>
                      <FieldLabel>Available Days</FieldLabel>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select which days of the week this service can be
                        booked. Leave empty to allow any day.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = field.state.value.includes(
                            day.value,
                          );
                          return (
                            <Button
                              key={day.value}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className={cn("h-10 w-10 p-0 rounded-full")}
                              onClick={() => {
                                const newValue = isSelected
                                  ? field.state.value.filter(
                                      (v: number) => v !== day.value,
                                    )
                                  : [...field.state.value, day.value];
                                field.handleChange(newValue);
                              }}
                            >
                              {day.label}
                            </Button>
                          );
                        })}
                      </div>
                    </Field>
                  )}
                />
              ) : null
            }
          />
        </FormSection>
      </div>
    );
  },
});
