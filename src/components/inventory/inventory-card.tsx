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
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  itemType: InventoryItemType;
  thumbnail?: string[];
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
      <CardHeader>
        <CardTitle className="font-bold text-xl">{item.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {item.description}
        </CardDescription>
      </CardHeader>

      <div className="grow" />

      <CardFooter>
        <Dialog>
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
              itemType={item.itemType}
              mode="edit"
              initialValues={{
                name: item.name,
                description: item.description,
                type: item.type,
                status: item.status,
                thumbnail: item.thumbnail ?? [],
              }}
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
