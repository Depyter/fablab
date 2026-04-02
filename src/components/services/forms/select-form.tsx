import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";

interface SelectFormProps {
  title: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function SelectForm({
  title,
  options,
  value,
  onChange,
}: SelectFormProps) {
  return (
    <div className="w-full sm:max-w-3xl">
      <FormSection title={title}>
        <Field>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${title.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FormSection>
    </div>
  );
}
