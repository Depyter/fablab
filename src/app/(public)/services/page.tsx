"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCardClient } from "@/components/services/service-card-client";

export default function ServicesPage() {
  const services = useQuery(api.services.query.getServices);

  if (services === undefined) {
    return (
      <div className="container mx-auto p-6 space-y-3">
        <h1 className="text-3xl font-bold mb-6">Available Services</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Available Services</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No services available yet. Check back soon.
            </p>
          </CardContent>
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
            id={service._id}
            imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
            title={service.name}
          />
        ))}
      </div>
    </div>
  );
}
