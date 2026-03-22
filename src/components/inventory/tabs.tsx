import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryListView } from "@/components/inventory/inventory-view";
import type { InventoryItem } from "@/components/inventory/inventory-card";

// Mock data for different categories
const machines: InventoryItem[] = [
  {
    id: "1",
    name: "Prusa MK4",
    description:
      "High-resolution 3D printer with a build volume of 250x210x210mm.",
    status: "available",
    type: "3D Printer",
    itemType: "machine",
  },
  {
    id: "2",
    name: "Trotec Speedy 400",
    description: "High-power laser cutter with a cutting area of 1000x600mm.",
    status: "maintenance",
    type: "Laser Cutter",
    itemType: "machine",
  },
];

const rooms: InventoryItem[] = [
  {
    id: "3",
    name: "Workshop A",
    description: "Main workshop area equipped with heavy machinery.",
    status: "available",
    type: "Workshop Area",
    itemType: "room",
  },
  {
    id: "4",
    name: "Meeting Room 1",
    description: "Equipped with a projector and whiteboards.",
    status: "unavailable",
    type: "Meeting Room",
    itemType: "room",
  },
];

const tools: InventoryItem[] = [
  {
    id: "5",
    name: "Makita Drill",
    description: '18V LXT Lithium-Ion Brushless Cordless 1/2" Driver-Drill.',
    status: "available",
    type: "Power Tool",
    itemType: "tool",
  },
];

const misc: InventoryItem[] = [
  {
    id: "6",
    name: "PLA Filament - White",
    description: "1kg spool of 1.75mm white PLA filament.",
    status: "available",
    type: "Consumable",
    itemType: "misc",
  },
];

export function InventoryTab() {
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
