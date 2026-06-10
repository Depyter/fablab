import { ResourceCategory } from "@convex/constants";
import { InventoryItemForm } from "./inventory-item-form";

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
