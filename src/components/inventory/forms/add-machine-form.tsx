"use client";

import { InventoryItemForm } from "./inventory-item-form";

interface AddMachineFormProps {
  onSuccess?: () => void;
}

export function AddMachineForm({ onSuccess }: AddMachineFormProps) {
  return (
    <InventoryItemForm itemType="machine" mode="add" onSuccess={onSuccess} />
  );
}
