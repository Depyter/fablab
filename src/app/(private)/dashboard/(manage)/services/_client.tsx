"use client";

import React, { useState } from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ServiceCard } from "@/components/services/service-card";
import { PackageOpen, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataViewRoot,
  DataViewToolbar,
  DataViewFilters,
  DataViewContent,
} from "@/components/manage/data-view";

export function ServicesListClient({
  preloadedServices,
}: {
  preloadedServices: Preloaded<typeof api.services.query.getServices>;
}) {
  const services = usePreloadedAuthQuery(preloadedServices) ?? [];
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name-az" | "price-high" | "price-low">(
    "name-az",
  );

  const filteredServices = (() => {
    let result = [...services];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    const getSortPrice = (pricing: (typeof services)[number]["pricing"]) => {
      if (pricing.type === "FIXED") return pricing.amount;
      if (pricing.type === "PER_UNIT")
        return pricing.setupFee + pricing.ratePerUnit;
      if (pricing.type === "COMPOSITE")
        return pricing.setupFee + pricing.timeRate;
      return 0;
    };

    result.sort((a, b) => {
      const priceA = getSortPrice(a.pricing);
      const priceB = getSortPrice(b.pricing);
      if (sortBy === "price-high") return priceB - priceA;
      if (sortBy === "price-low") return priceA - priceB;
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  })();

  const activeFilterCount = [search.trim() !== "", sortBy !== "name-az"].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setSearch("");
    setSortBy("name-az");
  };

  return (
    <DataViewRoot>
      <DataViewToolbar
        title="Services"
        subtitle={
          filteredServices.length === services.length
            ? `${services.length} service${services.length === 1 ? "" : "s"}`
            : `${filteredServices.length} of ${services.length} services`
        }
        actions={
          <Link href="/dashboard/services/add-service">
            <Button size="sm" className="h-8 gap-1 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Service</span>
            </Button>
          </Link>
        }
      />

      <DataViewFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search services…"
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
      >
        <Select
          value={sortBy}
          onValueChange={(v: "name-az" | "price-high" | "price-low") =>
            setSortBy(v)
          }
        >
          <SelectTrigger className="h-7 w-auto min-w-28 text-xs bg-background border-border/60 shadow-none gap-1.5">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-az" className="text-xs">
              Name A → Z
            </SelectItem>
            <SelectItem value="price-high" className="text-xs">
              Price: high → low
            </SelectItem>
            <SelectItem value="price-low" className="text-xs">
              Price: low → high
            </SelectItem>
          </SelectContent>
        </Select>
      </DataViewFilters>

      <DataViewContent
        items={filteredServices}
        totalItems={services.length}
        renderItem={(service) => (
          <ServiceCard
            key={service._id}
            slug={service.slug}
            imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
            title={service.name}
            description={service.description}
            pricing={service.pricing}
          />
        )}
        emptyState={{
          icon: <PackageOpen className="size-12" />,
          title: "No services found",
          description:
            "The catalogue is empty. Create your first service to make it available for clients to browse and request.",
          action: (
            <Link href="/dashboard/services/add-service">
              <Button variant="outline" size="sm">
                Add Service
              </Button>
            </Link>
          ),
        }}
        filteredEmptyState={{
          icon: <Search className="size-8" />,
          title: "No matching services",
          description: "Try adjusting your filters.",
          action: (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ),
        }}
      />
    </DataViewRoot>
  );
}
