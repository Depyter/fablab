import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryListView } from "@/components/inventory/inventory-view";
import type { InventoryItem } from "@/components/inventory/inventory-card";

interface InventoryTabProps {
  items: InventoryItem[];
}

import { ResourceCategory } from "@convex/constants";

export function InventoryTab({ items }: InventoryTabProps) {
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
      <TabsList variant="line" className="pl-5 pt-2">
        <TabsTrigger value="machines">Machines</TabsTrigger>
        <TabsTrigger value="rooms">Rooms</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="misc">Misc</TabsTrigger>
      </TabsList>

      <TabsContent value="machines" className="mt-6">
        <InventoryListView items={machines} />
      </TabsContent>

      <TabsContent value="rooms" className="mt-6">
        <InventoryListView items={rooms} />
      </TabsContent>

      <TabsContent value="tools" className="mt-6">
        <InventoryListView items={tools} />
      </TabsContent>

      <TabsContent value="misc" className="mt-6">
        <InventoryListView items={misc} />
      </TabsContent>
    </Tabs>
  );
}
