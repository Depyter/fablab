"use client";

import { InventoryItemForm } from "./inventory-item-form";
import { ResourceCategory } from "@convex/constants";

interface AddToolFormProps {
  onSuccess?: () => void;
}

export function AddToolForm({ onSuccess }: AddToolFormProps) {
  return (
    <InventoryItemForm
      itemType={ResourceCategory.TOOL}
      mode="add"
      onSuccess={onSuccess}
    />
  );
}
