"use client";

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
  form: any;
  options: { label: string; value: string }[];
}
export function MachineSelectForm({ form, options }: MachineSelectFormProps) {
  return (
    <Card className="w-full sm:max-w-md">
      <CardHeader className="font-bold text-lg">
        <CardTitle>Machines</CardTitle>
      </CardHeader>
      <CardContent>
        <form.Field
          name="machines"
          mode="array"
          children={(field: any) => {
            return (
              <div className="space-y-3">
                {/* Render existing selections as tags/cards */}
                {field.state.value.map(
                  (machineValue: string, index: number) => {
                    const label = options.find(
                      (o: any) => o.value === machineValue,
                    )?.label;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => field.removeValue(index)}
                        >
                          <XIcon className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    );
                  },
                )}

                {/* 2. Select to add a new machine */}
                <Select
                  onValueChange={(value) => {
                    // Prevent adding duplicates
                    if (!field.state.value.includes(value)) {
                      field.pushValue(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option: any) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={field.state.value.includes(option.value)}
                        className="focus:bg-chart-2"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
