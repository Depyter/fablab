"use client";

import { useState } from "react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import { InventoryTab } from "@/components/inventory/tabs";
import { Button } from "@/components/ui/button";
import { AddRoomForm } from "@/components/inventory/forms/add-room-form";
import { AddToolForm } from "@/components/inventory/forms/add-tool-form";
import { AddMachineForm } from "@/components/inventory/forms/add-machine-form";
import { AddMiscForm } from "@/components/inventory/forms/add-misc-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

interface InventoryClientProps {
  preloadedResources: Preloaded<typeof api.resource.query.getResources>;
}

export function InventoryClient({ preloadedResources }: InventoryClientProps) {
  const resources = usePreloadedQuery(preloadedResources);
  const [machineOpen, setMachineOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [miscOpen, setMiscOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-full max-w-50">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-full h-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1 h-9 max-w-40">
                <Plus className="h-4 w-4" />
                Add New Item
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <Dialog open={machineOpen} onOpenChange={setMachineOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Add machine
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
                  showCloseButton={false}
                >
                  <AddMachineForm onSuccess={() => setMachineOpen(false)} />
                </DialogContent>
              </Dialog>
              <Dialog open={toolOpen} onOpenChange={setToolOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Add tool
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
                  showCloseButton={false}
                >
                  <AddToolForm onSuccess={() => setToolOpen(false)} />
                </DialogContent>
              </Dialog>
              <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Add room
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
                  showCloseButton={false}
                >
                  <AddRoomForm onSuccess={() => setRoomOpen(false)} />
                </DialogContent>
              </Dialog>
              <Dialog open={miscOpen} onOpenChange={setMiscOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Add misc item
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-sm lg:max-w-3xl rounded-xl p-0 overflow-hidden"
                  showCloseButton={false}
                >
                  <AddMiscForm onSuccess={() => setMiscOpen(false)} />
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <InventoryTab items={resources ?? []} />
    </div>
  );
}
