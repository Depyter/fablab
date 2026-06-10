import { Search } from "lucide-react";
import type { MaterialItem } from "@/components/inventory/material-card";
import { MaterialCard } from "@/components/inventory/material-card";
import {
  ManageEmptyState,
  ManageGrid,
} from "@/components/manage/manage-primitives";

interface MaterialListViewProps {
  items: Array<MaterialItem>;
}

export function MaterialListView({ items }: MaterialListViewProps) {
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
        <MaterialCard key={item._id} item={item} />
      ))}
    </ManageGrid>
  );
}
