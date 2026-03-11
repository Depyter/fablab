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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MachineSelectFormProps {
  options: { label: string; value: string }[];
}

export function MachineSelectForm({ options }: MachineSelectFormProps) {
  // Local state just to manage the visual list of selected machines
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);

  const addMachine = (value: string) => {
    if (!selectedMachines.includes(value)) {
      setSelectedMachines([...selectedMachines, value]);
    }
  };

  const removeMachine = (indexToRemove: number) => {
    setSelectedMachines(selectedMachines.filter((_, i) => i !== indexToRemove));
  };

  return (
    <Card className="w-full sm:max-w-3xl">
      <CardHeader className="font-bold text-lg">
        <CardTitle>Machines</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Render existing selections */}
          {selectedMachines.map((machineValue: string, index: number) => {
            const label = options.find((o) => o.value === machineValue)?.label;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <span>{label}</span>

                {/* CRUCIAL: Hidden input ensures this value is included in the parent form's submission.
                  Multiple inputs with the same name="machines" create an array in FormData.
                */}
                <input type="hidden" name="machines" value={machineValue} />

                <button type="button" onClick={() => removeMachine(index)}>
                  <XIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            );
          })}

          {/* Select to add a new machine */}
          <Select onValueChange={addMachine}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select machine..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={selectedMachines.includes(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
