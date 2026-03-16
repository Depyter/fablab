import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MachinesListView } from "@/components/inventory/machines-view"

export function InventoryTab() {
  return (
    // Defaulting to "machines" so that tab is open when the page loads
    <Tabs defaultValue="machines" className="w-full">
      
      {/* The clickable tab buttons */}
      <TabsList variant="line" className="pl-5 pt-2">
        <TabsTrigger value="machines" >Machines</TabsTrigger>
        <TabsTrigger value="rooms">Rooms</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>

    
      <TabsContent value="machines" className="mt-6">
        <MachinesListView/>
      </TabsContent>

    
      <TabsContent value="rooms" className="mt-6">
        <div className="rounded-lg border p-8 text-center text-muted-foreground bg-gray-50/50">
          <p>Room inventory list or table goes here.</p>
        </div>
      </TabsContent>

      <TabsContent value="tools" className="mt-6">
        <div className="rounded-lg border p-8 text-center text-muted-foreground bg-gray-50/50">
          <p>Tool inventory list or table goes here.</p>
        </div>
      </TabsContent>
      
    </Tabs>
  );
}