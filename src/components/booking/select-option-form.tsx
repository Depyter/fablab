import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function RadioGroupChoiceCard() {
  return (
    <RadioGroup defaultValue="plus" className="max-w-full">
      <FieldLabel htmlFor="plus-plan">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Provide Materials</FieldTitle>
            <FieldDescription>
              For client with their own materials.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem value="plus" id="plus-plan" />
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="pro-plan">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Buy From Fablab</FieldTitle>
            <FieldDescription>
              For client with no on hand materials.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem value="pro" id="pro-plan" />
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}
