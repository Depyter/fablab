"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ServiceCard } from "@/components/services/service-card";
import { CardButton } from "@/components/card-button";
import { PackageOpen } from "lucide-react";

export function ServicesListClient({
  preloadedServices,
}: {
  preloadedServices: Preloaded<typeof api.services.query.getServices>;
}) {
  const services = usePreloadedQuery(preloadedServices);

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Available Services</h1>
        <p className="text-muted-foreground mt-2">
          {services.length === 0
            ? "No services yet — add one to get started."
            : `Total services: ${services.length}`}
        </p>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-8 py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-6">
              <PackageOpen className="size-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No services found</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              The catalogue is empty. Create your first service to make it
              available for clients to browse and request.
            </p>
          </div>
          <CardButton path="/dashboard/services/add-service" title="Add Service" description="Click to add a new service to the catalogue" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service._id}
              slug={service.slug}
              imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
              title={service.name}
              description={service.description}
              regularPrice={service.regularPrice}
              discountedPrice={service.upPrice}
              unit={service.unitPrice}
            />
          ))}
          <CardButton path="/dashboard/services/add-service" title="Add Service" description="Click to add a new service to the catalogue" />
        </div>
      )}
    </div>
  );
}
