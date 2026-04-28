"use client";

import { useEffect, useRef, useState } from "react";
import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FormSection } from "@/components/ui/form-section";
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
    const requirements = form.state.values.requirements;
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const nextRequirementKeyRef = useRef(0);
    const createRequirementKey = () =>
      `requirement-${nextRequirementKeyRef.current++}`;
    const [requirementKeys, setRequirementKeys] = useState(() =>
      requirements.map(() => createRequirementKey()),
    );

    useEffect(() => {
      setRequirementKeys((prev) => {
        if (prev.length === requirements.length) return prev;
        if (prev.length > requirements.length) {
          return prev.slice(0, requirements.length);
        }
        return [
          ...prev,
          ...Array.from(
            { length: requirements.length - prev.length },
            createRequirementKey,
          ),
        ];
      });
    }, [requirements.length]);

    const focusInputAt = (nextIndex: number) => {
      requestAnimationFrame(() => {
        inputRefs.current[nextIndex]?.focus();
      });
    };

    return (
      <div className="w-full sm:max-w-3xl">
        <FormSection
          title="Requirements"
          description="Specify the requirements for your service."
        >
          <form.Field
            name="requirements"
            mode="array"
            children={(field) => (
              <FieldSet className="gap-4">
                <FieldGroup className="gap-4">
                  {field.state.value.map((_req: string, index: number) => (
                    <form.Field
                      key={requirementKeys[index]}
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
                                    const nextIndex = index + 1;
                                    setRequirementKeys((prev) => [
                                      ...prev,
                                      createRequirementKey(),
                                    ]);
                                    field.pushValue("");
                                    focusInputAt(nextIndex);
                                  }
                                }}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => {
                                    if (index === 0) {
                                      subField.handleChange("");
                                      return;
                                    }
                                    setRequirementKeys((prev) =>
                                      prev.filter((_, i) => i !== index),
                                    );
                                    field.removeValue(index);
                                  }}
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
                      const nextIndex = field.state.value.length;
                      setRequirementKeys((prev) => [
                        ...prev,
                        createRequirementKey(),
                      ]);
                      field.pushValue("");
                      focusInputAt(nextIndex);
                    }}
                  >
                    <CirclePlus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </FieldGroup>
              </FieldSet>
            )}
          />
        </FormSection>
      </div>
    );
  },
});
