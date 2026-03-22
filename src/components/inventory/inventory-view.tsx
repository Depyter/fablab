"use client";

import {
  InventoryCard,
  type InventoryItem,
} from "@/components/inventory/inventory-card";

interface InventoryListViewProps {
  items: InventoryItem[];
}

export function InventoryListView({ items }: InventoryListViewProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>No items found in this category.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <InventoryCard key={item._id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
