import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ManageCard } from "@/components/manage/manage-card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  InventoryItemForm,
  InventoryItemType,
} from "@/components/inventory/forms/inventory-item-form";

export interface InventoryItem {
  _id: string;
  name: string;
  description: string;
  type: string;
  category: InventoryItemType;
  status: import("@convex/constants").ResourceStatusType;
  images: string[];
  imageUrls: string[];
}

interface InventoryCardProps {
  item: InventoryItem;
  showBadge?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "under maintenance": "bg-amber-100 text-amber-700 border-amber-200",
  maintenance: "bg-amber-100 text-amber-700 border-amber-200",
  unavailable: "bg-red-100 text-red-700 border-red-200",
};

export function InventoryCard({
  item,
  showBadge = true,
  className = "",
}: InventoryCardProps) {
  const [open, setOpen] = useState(false);
  const statusKey = item.status.toLowerCase();
  const badgeStyle =
    STATUS_STYLES[statusKey] ?? "bg-muted text-muted-foreground border-border";

  return (
    <ManageCard
      className={className}
      title={item.name}
      subtitle={
        <>
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)} ·{" "}
          {item.type}
        </>
      }
      description={item.description}
      coverUrl={item.imageUrls?.[0] || null}
      badgeText={showBadge ? item.status : undefined}
      badgeClassName={badgeStyle}
      action={
        <div className="w-full block">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
              >
                Edit Details
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden">
              <InventoryItemForm
                itemType={item.category}
                mode="edit"
                initialValues={{
                  _id: item._id,
                  name: item.name,
                  description: item.description,
                  type: item.type,
                  status: item.status,
                  thumbnail: item.images,
                }}
                initialImages={item.images?.map((id, i) => ({
                  storageId: id,
                  fileName: `Image ${i + 1}`,
                  fileType: "image/jpeg",
                  fileSize: 0,
                  uploadedAt: new Date(),
                  url: item.imageUrls?.[i],
                }))}
                onSuccess={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      }
    />
  );
}
