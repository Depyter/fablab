import { Search } from "lucide-react";
import type { InventoryItem } from "@/components/inventory/inventory-card";
import { InventoryCard } from "@/components/inventory/inventory-card";
import {
  ManageEmptyState,
  ManageGrid,
} from "@/components/manage/manage-primitives";

interface InventoryListViewProps {
  items: Array<InventoryItem>;
}

export function InventoryListView({ items }: InventoryListViewProps) {
  if (!items || items.length === 0) {
    return (
      <ManageEmptyState
        icon={<Search className="size-8" />}
        title="No items found"
        description="No inventory items found in this category matching your filters."
      />
    );
  }

  return (
    <ManageGrid>
      {items.map((item) => (
        <InventoryCard key={item._id} item={item} />
      ))}
    </ManageGrid>
  );
}
