"use client";

import { InventoryItemForm } from "./inventory-item-form";

interface AddMiscFormProps {
  onSuccess?: () => void;
}

export function AddMiscForm({ onSuccess }: AddMiscFormProps) {
  return <InventoryItemForm itemType="misc" mode="add" onSuccess={onSuccess} />;
}
