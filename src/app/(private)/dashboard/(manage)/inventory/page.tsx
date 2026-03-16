"use client";

import { InventoryTab } from "@/components/inventory/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function InventoryPage() {

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inventory
          </h1>
          
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

          
          </div>
      </div>
      <InventoryTab/>
    </div>
  );
}