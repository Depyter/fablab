"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard } from "@/components/services/service-card";
import { CardButton } from "@/components/services/card-button";
import { MOCK_SERVICES } from "@/lib/mock-data";

export default function ServicesPage() {
  const services = useQuery(api.services.query.getServices);
  const mockServiceList = MOCK_SERVICES;

  // Loading State
  if (services === undefined) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold mb-6">Available Services</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (services.length === 0 && mockServiceList.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Available Services</h1>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No services found.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main 
  return (
    <div className="container mx-auto p-8">
      <div className="mb-6 sticky">
        <h1 className="text-3xl font-bold">Available Services</h1>
        <p className="text-muted-foreground mt-2">
          Total services: {mockServiceList.length}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockServiceList.map((service) => (
         
            <ServiceCard
              key={service.id}
              id = {service.id}
              imageSrc={service.images[0]}
              title={service.title}
              description={service.description}
              regularPrice={service.regularPrice}
              discountedPrice={service.discountedPrice}
              unit={service.unit}
              
            />
         
        ))}
        <CardButton />
      </div>
    </div>
  );
}