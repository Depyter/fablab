"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesDebugPage() {
  const services = useQuery(api.services.query.getServices);

  if (services === undefined) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold mb-6">Services Debug Page</h1>
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
        <h1 className="text-3xl font-bold mb-6">Services Debug Page</h1>
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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Services Debug Page</h1>
        <p className="text-muted-foreground mt-2">
          Total services: {services.length}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service._id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex-1">{service.name}</CardTitle>
                <Badge
                  variant={
                    service.status === "Available" ? "default" : "destructive"
                  }
                >
                  {service.status}
                </Badge>
              </div>
              <CardDescription>{service.type}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Description:
                </p>
                <p className="text-sm">{service.description}</p>
              </div>

              {service.images && service.images.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Images:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.images.map((imageId, index) => (
                      <Badge key={index} variant="outline">
                        {imageId.slice(0, 8)}...
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="text-xs text-muted-foreground border-t">
              ID: {service._id}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
