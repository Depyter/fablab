"use client";

import {
  InventoryCard,
  type InventoryItem,
} from "@/components/inventory/inventory-card";
import {
  ManageGrid,
  ManageEmptyState,
} from "@/components/manage/manage-layout";
import { Search } from "lucide-react";

interface InventoryListViewProps {
  items: InventoryItem[];
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
