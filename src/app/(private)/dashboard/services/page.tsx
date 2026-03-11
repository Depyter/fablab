"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard } from "@/components/services/service-card";
import { CardButton } from "@/components/services/card-button";

export default function ServicesPage() {
  const services = useQuery(api.services.query.getServices);

  if (services === undefined) {
    return (
      <div className="container mx-auto p-8 space-y-4">
        <h1 className="text-3xl font-bold">Available Services</h1>
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
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Available Services</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No services found. Add some services to see them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Available Services</h1>
        <p className="text-muted-foreground mt-2">
          Total services: {services.length}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service._id}
            id={service._id}
            imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
            title={service.name}
            description={service.description}
            regularPrice={service.regularPrice}
            discountedPrice={service.upPrice}
            unit={service.unitPrice}
          />
        ))}

        <CardButton />
      </div>
    </div>
  );
}
