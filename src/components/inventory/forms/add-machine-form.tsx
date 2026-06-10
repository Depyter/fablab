import { ResourceCategory } from "@convex/constants";
import { InventoryItemForm } from "./inventory-item-form";

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
