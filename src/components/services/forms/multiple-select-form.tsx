"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";

interface MultipleSelectFormProps {
  options: { label: string; value: string }[];
  title?: string;
  fieldName?: string;
  placeholder?: string;
  value?: string[];
  onChange?: (value: string[]) => void;
}

export function MultipleSelectForm({
  options,
  title = "Machines",
  fieldName = "machines",
  placeholder = "Select item...",
  value,
  onChange,
}: MultipleSelectFormProps) {
  // Local state as fallback for uncontrolled usage
  const [localValues, setLocalValues] = useState<string[]>([]);

  const selectedValues = value ?? localValues;

  const addMachine = (val: string) => {
    if (!selectedValues.includes(val)) {
      const newValues = [...selectedValues, val];
      if (onChange) onChange(newValues);
      else setLocalValues(newValues);
    }
  };

  const removeMachine = (indexToRemove: number) => {
    const newValues = selectedValues.filter((_, i) => i !== indexToRemove);
    if (onChange) onChange(newValues);
    else setLocalValues(newValues);
  };

  return (
    <div className="w-full sm:max-w-3xl">
      <FormSection title={title} className="space-y-1 flex flex-col gap-2">
        {/* Render existing selections */}
        {selectedValues.map((machineValue: string, index: number) => {
          const label = options.find((o) => o.value === machineValue)?.label;
          return (
            <div
              key={machineValue}
              className="flex items-center justify-between p-2 border rounded-lg bg-gray-50"
            >
              <span>{label ?? machineValue}</span>

              {/* CRUCIAL: Hidden input ensures this value is included in the parent form's submission.
                  if used without react-form field binding. */}
              {!value && (
                <input type="hidden" name={fieldName} value={machineValue} />
              )}

              <button type="button" onClick={() => removeMachine(index)}>
                <XIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          );
        })}

        {/* Select to add a new machine */}
        <Select onValueChange={addMachine}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={selectedValues.includes(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>
    </div>
  );
}
