"use client";

import * as React from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { Preloaded } from "convex/react";
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

type ServicesSort = "name-az" | "price-high" | "price-low";

const SORT_OPTIONS: ServicesSort[] = ["name-az", "price-high", "price-low"];

export function ServicesListClient({
  preloadedServices,
}: {
  preloadedServices: Preloaded<typeof api.services.query.getServices>;
}) {
  const { searchParams, replaceParams } = useDataViewRouteState();
  const servicesQuery = usePreloadedAuthQuery(preloadedServices);
  const services = React.useMemo(() => servicesQuery ?? [], [servicesQuery]);
  const search = getSearchParam(searchParams, "search");
  const sortRaw = getSearchParam(searchParams, "sort", "name-az");
  const sortBy: ServicesSort = SORT_OPTIONS.includes(sortRaw as ServicesSort)
    ? (sortRaw as ServicesSort)
    : "name-az";
  const isLoading = servicesQuery === undefined;

  const filteredServices = React.useMemo(() => {
    let result = [...services];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    const getSortPrice = (
      cat: (typeof services)[number]["serviceCategory"],
    ) => {
      if (cat.type === "WORKSHOP") return cat.amount;
      if (cat.type === "FABRICATION") return cat.setupFee + cat.timeRate;
      return 0;
    };

    result.sort((a, b) => {
      const priceA = getSortPrice(a.serviceCategory);
      const priceB = getSortPrice(b.serviceCategory);
      if (sortBy === "price-high") return priceB - priceA;
      if (sortBy === "price-low") return priceA - priceB;
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [search, services, sortBy]);

  return (
    <DataViewContent
      items={filteredServices}
      totalItems={services.length}
      isLoading={isLoading}
      renderItem={(service) => (
        <ServiceCard
          key={service._id}
          slug={service.slug}
          imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
          title={service.name}
          description={service.description}
          pricing={
            service.serviceCategory.type === "WORKSHOP"
              ? {
                  type: "FIXED" as const,
                  amount: service.serviceCategory.amount,
                  variants: service.serviceCategory.variants,
                }
              : {
                  type: "FABRICATION" as const,
                  setupFee: service.serviceCategory.setupFee,
                  unitName: service.serviceCategory.unitName,
                  timeRate: service.serviceCategory.timeRate,
                  variants: service.serviceCategory.variants,
                }
          }
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
