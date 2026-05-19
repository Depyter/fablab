"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ServiceCard } from "@/components/services/service-card";
import { PackageOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DataViewContent } from "@/components/manage/data-view";
import {
  getSearchParam,
  useDataViewRouteState,
} from "@/components/manage/data-view-route-state";
import { DataViewGridLoadingState } from "@/components/manage/data-view-loading";

type ServicesSort = "name-az" | "price-high" | "price-low";

const SORT_OPTIONS: ServicesSort[] = ["name-az", "price-high", "price-low"];

export function ServicesListClient() {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const services = useQuery(api.services.query.getServices);

  const search = getSearchParam(searchParams, "search");
  const sortRaw = getSearchParam(searchParams, "sort", "name-az");

  const sortBy: ServicesSort = SORT_OPTIONS.includes(sortRaw as ServicesSort)
    ? (sortRaw as ServicesSort)
    : "name-az";

  const isLoading = services === undefined;

  const filteredServices = React.useMemo(() => {
    if (!services) return [];
    let result = [...services];

    // Only show fabrication services — workshops have their own page.
    result = result.filter(
      (s) => s.serviceCategory.type === "FABRICATION",
    ) as typeof result;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      // Both are FABRICATION at this point (filtered above).
      const catA = a.serviceCategory as { setupFee: number; timeRate: number };
      const catB = b.serviceCategory as { setupFee: number; timeRate: number };
      const priceA = catA.setupFee + catA.timeRate;
      const priceB = catB.setupFee + catB.timeRate;
      if (sortBy === "price-high") return priceB - priceA;
      if (sortBy === "price-low") return priceA - priceB;
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [search, services, sortBy]);

  if (isLoading) {
    return <DataViewGridLoadingState />;
  }

  return (
    <DataViewContent
      items={filteredServices}
      totalItems={services.length}
      isLoading={isLoading}
      renderItem={(service) => {
        const cat = service.serviceCategory as {
          setupFee: number;
          unitName: string;
          timeRate: number;
          variants?:
            | { name: string; setupFee: number; timeRate: number }[]
            | undefined;
        };
        return (
          <ServiceCard
            key={service._id}
            slug={service.slug}
            imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
            title={service.name}
            description={service.description}
            showBadge={false}
            pricing={{
              type: "FABRICATION" as const,
              setupFee: cat.setupFee,
              unitName: cat.unitName,
              timeRate: cat.timeRate,
              variants: cat.variants,
            }}
          />
        );
      }}
      emptyState={{
        icon: <PackageOpen className="size-12" />,
        title: "No fabrication services",
        description:
          "The fabrication catalogue is empty. Create your first fabrication service to make it available for clients to request.",
        action: (
          <Link href="/dashboard/services/add-service">
            <Button variant="outline" size="sm">
              Add Fabrication Service
            </Button>
          </Link>
        ),
      }}
      filteredEmptyState={{
        icon: <Search className="size-8" />,
        title: "No matching services",
        description: "Try adjusting your filters.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => replaceParams({ search: null, sort: null })}
          >
            Clear filters
          </Button>
        ),
      }}
    />
  );
}
