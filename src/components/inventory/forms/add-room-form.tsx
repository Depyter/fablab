"use client";

import { InventoryItemForm } from "./inventory-item-form";
import { ResourceCategory } from "@convex/constants";

interface AddRoomFormProps {
  onSuccess?: () => void;
}

export function AddRoomForm({ onSuccess }: AddRoomFormProps) {
  return (
    <InventoryItemForm
      itemType={ResourceCategory.ROOM}
      mode="add"
      onSuccess={onSuccess}
    />
  );
}
