import { ResourceCategory } from "@convex/constants";
import { InventoryItemForm } from "./inventory-item-form";

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
