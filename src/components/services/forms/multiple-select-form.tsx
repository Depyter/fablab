"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { XIcon, Plus } from "lucide-react";
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
  /** When provided, shows an "Add new…" option in the select that calls this callback. */
  onAddNew?: () => void;
  /** Label for the add-new option. Defaults to "Add new…" */
  addNewLabel?: string;
}

export function MultipleSelectForm({
  options,
  title = "Machines",
  fieldName = "machines",
  placeholder = "Select item...",
  value,
  onChange,
  onAddNew,
  addNewLabel,
}: MultipleSelectFormProps) {
  // Local state as fallback for uncontrolled usage
  const [localValues, setLocalValues] = useState<string[]>([]);

  const selectedValues = value ?? localValues;

  const addItem = (val: string) => {
    if (val === "__add_new__") {
      onAddNew?.();
      return;
    }
    if (!selectedValues.includes(val)) {
      const newValues = [...selectedValues, val];
      if (onChange) onChange(newValues);
      else setLocalValues(newValues);
    }
  };

  const removeItem = (indexToRemove: number) => {
    const newValues = selectedValues.filter((_, i) => i !== indexToRemove);
    if (onChange) onChange(newValues);
    else setLocalValues(newValues);
  };

  const resourceLabel =
    title.toLowerCase().includes("material") ? "material" : "resource";

  return (
    <div className="w-full sm:max-w-3xl">
      <FormSection title={title} className="space-y-1 flex flex-col gap-2">
        {/* Render existing selections */}
        {selectedValues.map((val: string, index: number) => {
          const label = options.find((o) => o.value === val)?.label;
          return (
            <div
              key={val}
              className="flex items-center justify-between p-2 border-2 rounded-none border-black bg-white"
            >
              <span>{label ?? val}</span>

              {/* CRUCIAL: Hidden input ensures this value is included in the parent form's submission.
                  if used without react-form field binding. */}
              {!value && (
                <input type="hidden" name={fieldName} value={val} />
              )}

              <button type="button" onClick={() => removeItem(index)}>
                <XIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          );
        })}

        {/* Select to add an item */}
        <Select onValueChange={addItem}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 && !onAddNew && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No {resourceLabel}s available.
              </div>
            )}
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={selectedValues.includes(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
            {onAddNew && (
              <SelectItem
                value="__add_new__"
                className="font-medium text-fab-teal"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {addNewLabel ?? `Add new ${resourceLabel}…`}
                </span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </FormSection>
    </div>
  );
}
