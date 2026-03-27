"use client";

import { InventoryItemForm } from "./inventory-item-form";

interface AddToolFormProps {
  onSuccess?: () => void;
}

export function AddToolForm({ onSuccess }: AddToolFormProps) {
  return <InventoryItemForm itemType="tool" mode="add" onSuccess={onSuccess} />;
}
