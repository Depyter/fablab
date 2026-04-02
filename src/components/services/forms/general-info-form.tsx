"use client";

import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FormSection } from "@/components/ui/form-section";

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
        </FormSection>
      </div>
    );
  },
});
