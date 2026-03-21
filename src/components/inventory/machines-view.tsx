"use client";

import { Car, Search } from "lucide-react";
import { MachineCard } from "@/components/inventory/machine-card";
import { Input } from "@/components/ui/input";
import { CardButton } from "../card-button";

const machines = [
  {
    machineId: "1",
    name: "3D Printer",
    specs: "High-resolution 3D printer with a build volume of 200x200x200mm.",
    status: "available",
    service: "3D Printing",
  },
  {
    machineId: "2",
    name: "Laser Cutter",
    specs: "High-power laser cutter with a cutting area of 1200x600mm.",
    status: "maintenance",
    service: "Laser Cutting",
  },
];

export function MachinesListView() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {machines.map((machine) => (
            <MachineCard
              key={machine.machineId}
              machineName={machine.name}
              specifications={machine.specs}
              serviceName={machine.service}
              status={machine.status}
            />
          ))}

          {/* <CardButton path="/dashboard/inventory/add-machine" title="Add Machine" description="Register a new machine in the inventory" /> */}
        </div>
      </div>
    </div>
  );
}
