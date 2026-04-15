import {
  MaterialCard,
  type MaterialItem,
} from "@/components/inventory/material-card";
import {
  ManageGrid,
  ManageEmptyState,
} from "@/components/manage/manage-layout";
import { Search } from "lucide-react";

interface MaterialListViewProps {
  items: MaterialItem[];
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
