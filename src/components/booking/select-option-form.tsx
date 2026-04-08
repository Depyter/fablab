import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RadioGroupChoiceCardProps {
  value: string;
  onValueChange: (value: string) => void;
  disableBuyFromLab?: boolean;
}

export function RadioGroupChoiceCard({
  value,
  onValueChange,
  disableBuyFromLab,
}: RadioGroupChoiceCardProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className="max-w-full"
    >
      <FieldLabel htmlFor="plus-plan">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Provide Materials</FieldTitle>
            <FieldDescription>
              For client with their own materials.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem value="provide-own" id="plus-plan" />
        </Field>
      </FieldLabel>
      <FieldLabel
        htmlFor="pro-plan"
        className={disableBuyFromLab ? "opacity-50 cursor-not-allowed" : ""}
      >
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Buy from FabLab</FieldTitle>
            <FieldDescription>
              User will choose material in the inventory.
              {disableBuyFromLab &&
                " (No materials available for this service)"}
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem
            value="buy-from-lab"
            id="pro-plan"
            disabled={disableBuyFromLab}
          />
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}
