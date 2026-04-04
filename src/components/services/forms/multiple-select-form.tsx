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
}

export function MultipleSelectForm({
  options,
  title = "Machines",
  fieldName = "machines",
  placeholder = "Select item...",
}: MultipleSelectFormProps) {
  // Local state just to manage the visual list of selected items
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const addMachine = (value: string) => {
    if (!selectedValues.includes(value)) {
      setSelectedValues([...selectedValues, value]);
    }
  };

  const removeMachine = (indexToRemove: number) => {
    setSelectedValues(selectedValues.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="w-full sm:max-w-3xl">
      <FormSection title={title} className="space-y-1 flex flex-col gap-2">
        {/* Render existing selections */}
        {selectedValues.map((machineValue: string, index: number) => {
          const label = options.find((o) => o.value === machineValue)?.label;
          return (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded-lg bg-gray-50"
            >
              <span>{label ?? machineValue}</span>

              {/* CRUCIAL: Hidden input ensures this value is included in the parent form's submission.
                  Multiple inputs with the same name="machines" create an array in FormData.
                */}
              <input type="hidden" name={fieldName} value={machineValue} />

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
