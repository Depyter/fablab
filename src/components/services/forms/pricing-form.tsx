import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";

export function PricingForm() {
  return (
    <Card className="w-full sm:max-w-3xl">
      <CardHeader>
        <CardTitle className="font-bold text-lg">Pricing</CardTitle>
        <CardDescription>
          Set the pricing details for your service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="flex flex-row gap-5">
            {/* Regular Price */}
            <Field>
              <FieldLabel htmlFor="regularPrice">Regular Price</FieldLabel>
              {/* Changed 'has-...' classes to standard 'focus-within:...' classes */}
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
                />
              </InputGroup>
            </Field>

            {/* UP Rate */}
            <Field>
              <FieldLabel htmlFor="discountedPrice">UP Rate</FieldLabel>
              <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400 data-invalid-border-destructive">
                <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground focus:ring-3">
                  <InputGroupText>₱</InputGroupText>
                </InputGroupAddon>
                <Input
                  id="discountedPrice"
                  name="discountedPrice"
                  type="number"
                  placeholder="0.00"
                  className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
                />
              </InputGroup>
            </Field>
          </div>

          {/* Unit */}
          <Field>
            <FieldLabel htmlFor="unit">Unit</FieldLabel>
            <InputGroup className="flex items-center border border-input transition-shadow focus-within:ring-3 focus-within:ring-gray-300 focus-within:border-gray-400 data-invalid-border-destructive">
              <InputGroupAddon className="border-none bg-transparent ring-0 px-3 pr-1 text-muted-foreground">
                <InputGroupText>per</InputGroupText>
              </InputGroupAddon>
              <Input
                id="unit"
                name="unit"
                placeholder="e.g., hour, item"
                className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pl-1"
              />
            </InputGroup>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
