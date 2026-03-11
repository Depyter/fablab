import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
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
    <Card className="w-full sm:max-w-3xl">
      <CardHeader>
        <CardTitle className="font-bold text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
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
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
