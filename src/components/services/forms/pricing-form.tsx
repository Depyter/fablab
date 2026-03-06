"use client"


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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { AddServiceFromValues } from "@/app/(private)/dashboard/services/add-service/page"

interface PricingFormProps {
    form: any;
}

export function PricingForm( { form }: PricingFormProps ) {
  return (
    <Card className="w-full sm:max-w-md">
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
        <CardDescription>
            Set the pricing details for your service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        
        <FieldGroup>
            <div className="flex flex-row gap-5">
                <form.Field
                name="regularPrice"
                children={(field:any) => {
                const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                return (
                    <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Regular Price</FieldLabel>
                      <InputGroup className="flex items-center border border-input transition-shadow has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-gray-300 has-[:focus-visible]:border-gray-400 data-[invalid]:border-destructive"> 
                        <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                        </InputGroupAddon>
                        <Input
                            id={field.name} 
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="0.00"
                            autoComplete="off"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                        />
                    </InputGroup>
                    {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                    )}
                    </Field>
                )
                }}
            />
            <form.Field
                name="discountedPrice"
                children={(field:any) => {
                const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                return (
                    <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>UP Rate</FieldLabel>
                      <InputGroup className="flex items-center border border-input transition-shadow has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-gray-300 has-[:focus-visible]:border-gray-400 data-[invalid]:border-destructive"> 
                        <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                            <InputGroupText>₱</InputGroupText>
                        </InputGroupAddon>
                        <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="0.00"
                            autoComplete="off"
                            className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                        />
                    </InputGroup>
                    {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                    )}
                    </Field>
                )
                }}
            />
            </div>
            <form.Field
                name="unit"
                children={(field:any) => {
                const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                return (
                    <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Unit</FieldLabel>
                    <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter unit..."
                        autoComplete="off"
                    />
                    {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                    )}
                    </Field>
                )
                }}
            />
        </FieldGroup>
       
      </CardContent>
      
    </Card>
  )
}
