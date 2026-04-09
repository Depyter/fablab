import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ManageCard } from "@/components/manage/manage-card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MaterialForm } from "@/components/inventory/forms/material-form";

export interface MaterialItem {
  _id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  costPerUnit?: number;
  pricePerUnit?: number;
  reorderThreshold?: number;
  color?: string;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  image?: string;
  imageUrl: string | null;
}

interface MaterialCardProps {
  item: MaterialItem;
  showBadge?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  in_stock: "bg-emerald-100 text-emerald-700 border-emerald-200",
  low_stock: "bg-amber-100 text-amber-700 border-amber-200",
  out_of_stock: "bg-red-100 text-red-700 border-red-200",
};

export function MaterialCard({
  item,
  showBadge = true,
  className = "",
}: MaterialCardProps) {
  const [open, setOpen] = useState(false);
  const statusKey = item.status.toLowerCase();
  const badgeStyle =
    STATUS_STYLES[statusKey] ?? "bg-muted text-muted-foreground border-border";

  const description = `Stock: ${item.currentStock} ${item.unit} | Cost: ₱${item.costPerUnit || 0} | Price: ₱${item.pricePerUnit || 0}`;

  return (
    <ManageCard
      className={className}
      title={item.name}
      subtitle={
        <>
          {item.category} {item.color ? `· ${item.color}` : ""}
        </>
      }
      description={description}
      coverUrl={item.imageUrl}
      badgeText={showBadge ? item.status.replace(/_/g, " ") : undefined}
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
              <MaterialForm
                mode="edit"
                initialValues={{
                  _id: item._id,
                  name: item.name,
                  category: item.category,
                  unit: item.unit,
                  currentStock: item.currentStock,
                  costPerUnit: item.costPerUnit ?? 0,
                  pricePerUnit: item.pricePerUnit ?? 0,
                  reorderThreshold: item.reorderThreshold ?? 0,
                  color: item.color ?? "",
                  status: item.status,
                  image: item.image,
                }}
                initialImages={
                  item.image
                    ? [
                        {
                          storageId: item.image,
                          fileName: item.name,
                          fileType: "image/jpeg",
                          fileSize: 0,
                          uploadedAt: new Date(),
                          url: item.imageUrl || undefined,
                        },
                      ]
                    : []
                }
                onSuccess={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      }
    />
  );
}
