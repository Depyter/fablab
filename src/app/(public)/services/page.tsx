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
import { ServiceCard } from "@/components/services/service-card";
import { CardButton } from "@/components/services/card-button";
import { union } from "better-auth";

export default function ServicesPage() {
  const services = useQuery(api.services.query.getServices);

  const mockServiceList = [
    {
      id: 1,
      imageSrc: "/fablab_mural.png",
      title: "3D Printing Service",
      description:
        "Professional 3D printing service offering FDM and resin printing in various materials. Perfect for prototyping, product development, custom parts, and creative projects. ",
      regularPrice: 3,
      discountedPrice: 2,
      unit: "min",
    },
    {
      id: 2,
      imageSrc: "/fablab_mural.png",
      title: "Laser Cutting Service",
      description:
        "Precision laser cutting service for various materials including wood, acrylic, and fabric. Ideal for detailed designs and custom projects.",
      regularPrice: 20,
      discountedPrice: 15,
      unit: "min",
    },
    {
      id: 3,
      imageSrc: "/fablab_mural.png",
      title: "Large CNC Service",
      description:
        "High-quality CNC machining service for large-scale projects. We can handle a variety of materials and provide precise cuts for your custom needs.",
      regularPrice: 420,
      discountedPrice: 360,
      unit: "hr",
    },
  ];

  if (services === undefined) {
    return (
      <div className="container mx-auto p-6 space-y-4">
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

  if (services.length === 0 && mockServiceList.length === 0) {
    return (
      <div className="container mx-auto p-6">
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
        {mockServiceList.map((service) => (
          <ServiceCard
            key={service.id}
            imageSrc={service.imageSrc}
            title={service.title}
            description={service.description}
            regularPrice={service.regularPrice}
            discountedPrice={service.discountedPrice}
            unit={service.unit}
          />
        ))}
      </div>
    </div>
  );
}
