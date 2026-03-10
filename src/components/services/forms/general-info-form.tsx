"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export function GeneralInfoForm() {
  return (
    <Card className="w-full sm:max-w-3xl">
      <CardHeader>
        <CardTitle className="font-bold text-lg">General Information</CardTitle>
        <CardDescription>Provide details about your service.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Service Name</FieldLabel>
            <Input
              id="title"
              placeholder="Enter service name..."
            />

          </Field>

          <Field >
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id="description"
                placeholder="Description of service..."
                rows={6}
                className="min-h-24 resize-none"
  
              />
            </InputGroup>
          </Field>
    
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
