import { withForm } from "@/lib/form-context";
import { addServiceFormOpts } from "@/types/add-service";
import { FormSection } from "@/components/ui/form-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";

export const PricingForm = withForm({
  ...addServiceFormOpts,
  render: function PricingRender({ form }) {
    return (
      <div className="w-full sm:max-w-3xl">
        <FormSection
          title="Pricing"
          description="Set the pricing details for your service."
        >
          <div className="flex flex-row gap-5">
            {/* Regular Price */}
            <form.Field
              name="regularPrice"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="regularPrice">Regular Price</FieldLabel>
                  <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400 data-invalid-border-destructive">
                    <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                      <InputGroupText>₱</InputGroupText>
                    </InputGroupAddon>
                    <Input
                      id="regularPrice"
                      name="regularPrice"
                      type="number"
                      placeholder="0.00"
                      className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                      value={field.state.value === 0 ? "" : field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      onBlur={field.handleBlur}
                    />
                  </InputGroup>
                </Field>
              )}
            />

            {/* UP Rate */}
            <form.Field
              name="upPrice"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="upPrice">UP Rate</FieldLabel>
                  <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400 data-invalid-border-destructive">
                    <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground focus:ring-3">
                      <InputGroupText>₱</InputGroupText>
                    </InputGroupAddon>
                    <Input
                      id="upPrice"
                      name="upPrice"
                      type="number"
                      placeholder="0.00"
                      className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                      value={field.state.value === 0 ? "" : field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      onBlur={field.handleBlur}
                    />
                  </InputGroup>
                </Field>
              )}
            />
          </div>

          {/* Unit */}
          <form.Field
            name="unitPrice"
            children={(field) => (
              <Field>
                <FieldLabel htmlFor="unitPrice">Unit</FieldLabel>
                <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400 data-invalid-border-destructive">
                  <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                    <InputGroupText>per</InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    placeholder="e.g., hour, item"
                    className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          />
        </FormSection>
      </div>
    );
  },
});
