"use client";

import { useState } from "react";

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
  /** When true, renders without the card wrapper for inline use. */
  compact?: boolean;
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
  compact = false,
}: MultipleSelectFormProps) {
  // Local state as fallback for uncontrolled usage
  const [localValues, setLocalValues] = useState<string[]>([]);

  const selectedValues = value ?? localValues;

  // Reset select to placeholder after every pick so the user can
  // immediately select another item (or the same "Add new…" trigger).
  const [selectKey, setSelectKey] = useState(0);

  const addItem = (val: string) => {
    if (val === "__add_new__") {
      setSelectKey((k) => k + 1);
      onAddNew?.();
      return;
    }
    if (!selectedValues.includes(val)) {
      const newValues = [...selectedValues, val];
      if (onChange) onChange(newValues);
      else setLocalValues(newValues);
      setSelectKey((k) => k + 1);
    }
  };

  const removeItem = (indexToRemove: number) => {
    const newValues = selectedValues.filter((_, i) => i !== indexToRemove);
    if (onChange) onChange(newValues);
    else setLocalValues(newValues);
  };

  const resourceLabel = title.toLowerCase().includes("material")
    ? "material"
    : "resource";

  return (
    <div className={`w-full ${compact ? "" : "sm:max-w-3xl"}`}>
      {compact ? (
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            {title}
          </label>
          {renderItems()}
        </div>
      ) : (
        <FormSection title={title} className="space-y-1 flex flex-col gap-2">
          {renderItems()}
        </FormSection>
      )}
    </div>
  );

  function renderItems() {
    return (
      <>
        {/* Render existing selections */}
        {selectedValues.map((val: string, index: number) => {
          const label = options.find((o) => o.value === val)?.label;
          return (
            <div
              key={val}
              className="flex items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            >
              <span>{label ?? val}</span>

              {/* CRUCIAL: Hidden input ensures this value is included in the parent form's submission.
                  if used without react-form field binding. */}
              {!value && <input type="hidden" name={fieldName} value={val} />}

              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {/* Select to add an item */}
        <Select key={selectKey} onValueChange={addItem}>
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
      </>
    );
  }
}
