"use client";

import { InventoryItemForm } from "./inventory-item-form";

interface AddRoomFormProps {
  onSuccess?: () => void;
}

export function AddRoomForm({ onSuccess }: AddRoomFormProps) {
  return <InventoryItemForm itemType="room" mode="add" onSuccess={onSuccess} />;
}
