"use client";

import { InventoryItemForm } from "./inventory-item-form";
import { ResourceCategory } from "@convex/constants";

interface AddMiscFormProps {
  onSuccess?: () => void;
}

export function AddMiscForm({ onSuccess }: AddMiscFormProps) {
  return (
    <InventoryItemForm
      itemType={ResourceCategory.MISC}
      mode="add"
      onSuccess={onSuccess}
    />
  );
}
