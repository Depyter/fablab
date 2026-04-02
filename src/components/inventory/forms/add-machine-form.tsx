"use client";

import { InventoryItemForm } from "./inventory-item-form";
import { ResourceCategory } from "@convex/constants";

interface AddMachineFormProps {
  onSuccess?: () => void;
}

export function AddMachineForm({ onSuccess }: AddMachineFormProps) {
  return (
    <InventoryItemForm
      itemType={ResourceCategory.MACHINE}
      mode="add"
      onSuccess={onSuccess}
    />
  );
}
