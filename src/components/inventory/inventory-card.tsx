import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const getBadgeVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === "available") return "secondary";
  if (s === "maintenance" || s === "under maintenance") return "destructive";
  if (s === "unavailable") return "outline";
  return "default";
};

export function InventoryCard({
  item,
  showBadge = true,
  className = "",
}: InventoryCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      className={`relative mx-auto w-full max-w-sm pt-5 flex flex-col ${className}`}
    >
      <CardAction
        className={
          "absolute inset-0 z-40 p-4 flex items-start justify-end pointer-events-none"
        }
      >
        {showBadge && (
          <Badge
            variant={getBadgeVariant(item.status)}
            className="h-8 rounded-lg pointer-events-auto"
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        )}
      </CardAction>

      {item.imageUrls && item.imageUrls.length > 0 && (
        <div className="px-6 mb-4 h-40 w-full relative">
          <Image
            src={item.imageUrls[0]}
            alt={item.name}
            fill
            className="object-cover rounded-lg border"
          />
        </div>
      )}

      <CardHeader>
        <CardTitle className="font-bold text-xl">{item.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {item.description}
        </CardDescription>
      </CardHeader>

      <div className="grow" />

      <CardFooter>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-full px-10 bg-primary hover:bg-primary/80 hover:text-white text-white w-full"
            >
              View Details
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
      </CardFooter>
    </Card>
  );
}
