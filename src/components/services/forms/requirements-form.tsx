"use client";

import { useState, useRef } from "react";
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

export function RequirementsForm() {
  const [requirements, setRequirements] = useState<string[]>([""]);

  // auto add new field upon pressing enter
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addRequirement = () => {
    setRequirements([...requirements, ""]);

    setTimeout(() => {
      const newIndex = requirements.length; // The index the new item will have
      inputRefs.current[newIndex]?.focus();
    }, 50);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, value: string) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

  return (
    <Card className="w-full sm:max-w-3xl">
      <CardHeader>
        <CardTitle className="font-bold text-lg">Requirements</CardTitle>
        <CardDescription>
          Specify the requirements for your service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldSet className="gap-4">
          <FieldGroup className="gap-4">
            {requirements.map((req: string, index: number) => (
              <Field key={index} orientation="horizontal">
                <FieldContent>
                  <InputGroup>
                    <InputGroupInput
                      name="requirements"
                      value={req}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                      placeholder="Enter description..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault(); // Stop the form from submitting
                          addRequirement(); // Add the new field
                        }
                      }}
                    />
                    {requirements.length >= 1 && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeRequirement(index)}
                        >
                          <XIcon className="h-4 w-4" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                </FieldContent>
              </Field>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRequirement}
            >
              <CirclePlus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  );
}
