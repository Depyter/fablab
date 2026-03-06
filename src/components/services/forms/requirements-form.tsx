"use client"

import * as React from "react"
import type { FormApi } from "@tanstack/react-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { AddServiceFromValues } from "@/app/(private)/dashboard/services/add-service/page"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RequirementsFormProps {
    form: any;
}

export function RequirementsForm( { form }: RequirementsFormProps ) {
    const inputRefs = React.useRef<HTMLInputElement[]>([]);

    const addAndfocusInput = (field: any) => {
        field.pushValue("");

        setTimeout(() => {
            const lastIndex = field.state.value.length - 1;
            const lastInput = inputRefs.current[lastIndex];
            if (lastInput) {
                lastInput.focus();
            }
        }, 0);
    };

    return (
    <Card className="w-full sm:max-w-md">
      <CardHeader>
        <CardTitle>Requirements</CardTitle>
        <CardDescription>
          Specify the requirements for your service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        
        
        <form.Field
            name="requirements"
            mode="array"
            children={(field:any) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
                <FieldSet className="gap-4">
                    <FieldGroup className="gap-4">
                        {field.state.value.map((_, index) => (
                            <form.Field
                                key={index}
                                name={`${field.name}[${index}]`}
                                children={(subField:any) => { 
                                    const isSubFieldInvalid = subField.state.meta.isTouched && !subField.state.meta.isValid
                                    return (
                                        <Field 
                                            orientation="horizontal"
                                            data-invalid={isSubFieldInvalid}
                                        >
                                        <FieldContent>
                                            <InputGroup>
                                                <InputGroupInput
                                                    id={`from-tanstack-array-email-${index}`}
                                                    name={subField.name}
                                                    ref={(el) => (inputRefs.current[index] = el)}
                                                    value={subField.state.value}
                                                    onBlur={subField.handleBlur}
                                                    onChange={ (e) => 
                                                        subField.handleChange(e.target.value)
                                                    }
                                                    aria-invalid={isSubFieldInvalid}
                                                    placeholder="Enter description..."
                                                    autoComplete="off"

                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault(); // Stop the whole form from submitting
                                                            addAndfocusInput(field);
                                                        }
                                                    }}
                                                />
                                                {field.state.value.length >= 1 && (
                                                    <InputGroupAddon align="inline-end">
                                                        <InputGroupButton
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            onClick={() => field.removeValue(index)}
                                                            aria-label={`Remove requirement ${index + 1}`}
                                                        >
                                                            <XIcon />
                                                        </InputGroupButton>
                                                    </InputGroupAddon>
                                                )}
                                            </InputGroup>
                                            {isSubFieldInvalid && (
                                                <FieldError errors={subField.state.meta.errors} />
                                            )}
                                        </FieldContent>
                                        </Field>
                                    )
                                }}
                            />
                        ))}
                        <Button 
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.pushValue("")}
                            className=""
                        >
                            Add Requirement
                        </Button>
                
                </FieldGroup>
                {isInvalid && (<FieldError errors={field.state.meta.errors} /> )}
            </FieldSet>
            )
        }}

        />
        
      </CardContent>
      
    </Card>
  )
}
