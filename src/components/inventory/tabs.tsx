import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BrandTabsList, BrandTabsTrigger } from "@/components/brand/primitives";
import { InventoryListView } from "@/components/inventory/inventory-view";
import type { InventoryItem } from "@/components/inventory/inventory-card";
import { MaterialListView } from "@/components/inventory/material-view";
import type { MaterialItem } from "@/components/inventory/material-card";
import { ResourceCategory } from "@convex/constants";

interface InventoryTabProps {
  items: InventoryItem[];
  materials?: MaterialItem[];
}

const EMPTY_MATERIAL_ITEMS: MaterialItem[] = [];

export function InventoryTab({
  items,
  materials = EMPTY_MATERIAL_ITEMS,
}: InventoryTabProps) {
  // Filter items by category based on the backend schema
  // Group items by category
  const machines = items.filter(
    (item) => item.category === ResourceCategory.MACHINE,
  );
  const tools = items.filter((item) => item.category === ResourceCategory.TOOL);
  const rooms = items.filter((item) => item.category === ResourceCategory.ROOM);
  const misc = items.filter((item) => item.category === ResourceCategory.MISC);

  return (
    <Tabs defaultValue="machines" className="w-full">
      <BrandTabsList>
        <BrandTabsTrigger value="machines">Machines</BrandTabsTrigger>
        <BrandTabsTrigger value="rooms">Rooms</BrandTabsTrigger>
        <BrandTabsTrigger value="tools">Tools</BrandTabsTrigger>
        <BrandTabsTrigger value="misc">Misc</BrandTabsTrigger>
        <BrandTabsTrigger value="materials">Materials</BrandTabsTrigger>
      </BrandTabsList>

      <TabsContent value="machines" className="mt-6 px-4 sm:px-6">
        <InventoryListView items={machines} />
      </TabsContent>

      <TabsContent value="rooms" className="mt-6 px-4 sm:px-6">
        <InventoryListView items={rooms} />
      </TabsContent>

      <TabsContent value="tools" className="mt-6 px-4 sm:px-6">
        <InventoryListView items={tools} />
      </TabsContent>

      <TabsContent value="misc" className="mt-6 px-4 sm:px-6">
        <InventoryListView items={misc} />
      </TabsContent>

      <TabsContent value="materials" className="mt-6 px-4 sm:px-6">
        <MaterialListView items={materials} />
      </TabsContent>
    </Tabs>
  );
}
