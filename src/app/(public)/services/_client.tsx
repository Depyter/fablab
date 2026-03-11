"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ServiceCardClient } from "@/components/services/service-card-client";

export function ServicesListClient({
  preloadedServices,
}: {
  preloadedServices: Preloaded<typeof api.services.query.getServices>;
}) {
  const services = usePreloadedQuery(preloadedServices);

  if (services.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Available Services</h1>
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-center">
              No services available yet. Check back soon.
            </p>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Available Services</h1>
        <p className="text-muted-foreground mt-2">
          {services.length} service{services.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCardClient
            key={service._id}
            name={service.name}
            imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
            title={service.name}
          />
        ))}
      </div>
    </div>
  );
}
