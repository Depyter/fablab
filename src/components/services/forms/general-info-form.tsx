"use client";

import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";

export const GeneralInfoForm = withForm({
  ...addServiceFormOpts,
  render: function GeneralInfoRender({ form }) {
    return (
      <Card className="w-full sm:max-w-3xl">
        <CardHeader>
          <CardTitle className="font-bold text-lg">
            General Information
          </CardTitle>
          <CardDescription>Provide details about your service.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="name">Service Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="Enter service name..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </Field>
              )}
            />

            <form.Field
              name="description"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id="description"
                      placeholder="Description of service..."
                      rows={6}
                      className="min-h-24 resize-none"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </InputGroup>
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>
    );
  },
});
