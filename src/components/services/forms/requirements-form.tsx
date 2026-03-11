"use client";

import { useRef } from "react";
import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
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
  FieldContent,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { XIcon, CirclePlus } from "lucide-react";

export const RequirementsForm = withForm({
  ...addServiceFormOpts,
  render: function RequirementsRender({ form }) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    return (
      <Card className="w-full sm:max-w-3xl">
        <CardHeader>
          <CardTitle className="font-bold text-lg">Requirements</CardTitle>
          <CardDescription>
            Specify the requirements for your service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field
            name="requirements"
            mode="array"
            children={(field) => (
              <FieldSet className="gap-4">
                <FieldGroup className="gap-4">
                  {field.state.value.map((_req: string, index: number) => (
                    <form.Field
                      key={index}
                      name={`requirements[${index}]`}
                      children={(subField) => (
                        <Field orientation="horizontal">
                          <FieldContent>
                            <InputGroup>
                              <InputGroupInput
                                value={subField.state.value}
                                ref={(el) => {
                                  inputRefs.current[index] = el;
                                }}
                                onChange={(e) =>
                                  subField.handleChange(e.target.value)
                                }
                                onBlur={subField.handleBlur}
                                placeholder="Enter description..."
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    field.pushValue("");
                                    setTimeout(() => {
                                      inputRefs.current[
                                        field.state.value.length
                                      ]?.focus();
                                    }, 50);
                                  }
                                }}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => field.removeValue(index)}
                                >
                                  <XIcon className="h-4 w-4" />
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                          </FieldContent>
                        </Field>
                      )}
                    />
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      field.pushValue("");
                      setTimeout(() => {
                        inputRefs.current[field.state.value.length]?.focus();
                      }, 50);
                    }}
                  >
                    <CirclePlus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </FieldGroup>
              </FieldSet>
            )}
          />
        </CardContent>
      </Card>
    );
  },
});
