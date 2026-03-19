"use client";

import { useState, useEffect } from "react";
import { usePreloadedQuery, Preloaded, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CirclePercent, PhilippinePeso, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceTile } from "@/components/services/price-tile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ServiceGallery } from "@/components/services/image-carousel";
import Image from "next/image";

export function ServiceDetailClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedQuery(preloadedService);
  const router = useRouter();
  const deleteService = useMutation(api.services.mutate.deleteService);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Service can become null if it gets deleted while the user is viewing it.
  if (service === null) {
    return (
      <main className="container mx-auto max-w-6xl p-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/services">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-gray-200 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground text-center py-10">
          This service is no longer available.
        </p>
      </main>
    );
  }

  return (
    <main className="">
      <div className="container mx-auto max-w-6xl p-10">
        {/* Top Navigation & Actions */}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between mb-8 bg-white pb-4 ${
            isScrolled ? "border-b border-gray-200" : "border-b-0"
          }`}
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/services">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="bg-[#F1F1F1] text-gray-600 hover:bg-gray-200 px-6 font-medium rounded-lg"
              disabled={isDeleting}
              onClick={async () => {
                if (!service) return;
                setIsDeleting(true);
                try {
                  await deleteService({
                    service: service._id as Id<"services">,
                  });
                  router.push("/dashboard/services");
                } catch {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? "Removing..." : "Remove"}
            </Button>
            <Link
              href={service ? `/dashboard/services/${service.name}/edit` : "#"}
            >
              <Button className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg">
                Edit
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Gallery */}
          <div className="lg:col-span-5 space-y-4">
            <ServiceGallery images={service.imageUrls} />
          </div>

          {/* Right Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex gap-4">
              <PriceTile
                label="Regular Price"
                price={service.regularPrice}
                unit={service.unitPrice}
                icon={
                  <div className="border-gray-200 rounded-full border-2 w-6 h-6 items-center p-0.5 justify-center align-middle">
                    <PhilippinePeso className="h-4 w-4 text-gray-200 stroke-2.5" />
                  </div>
                }
              />
              <PriceTile
                label="UP Rate"
                price={service.upPrice}
                unit={service.unitPrice}
                icon={<CirclePercent className="h-6 w-6 text-gray-200" />}
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-8 relative min-h-125">
              <div className="absolute top-6 right-8 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Status
                </span>
                <Badge className="bg-[#F4FBF9] text-chart-6 border-none px-4 py-1 font-semibold">
                  {service.status}
                </Badge>
              </div>

              <section className="mb-10">
                <h3 className="text-lg font-bold mb-3">Description</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                  {service.description}
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">Requirements</h3>
                {service.requirements.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-500 text-sm space-y-2">
                    {service.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">
                    No requirements listed.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Projects */}
      <section className="mt-8 bg-light-yellow p-10">
        <h2 className="text-xl font-bold mb-4">Sample Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {service.sampleUrls.map((url, index) => (
            <div key={index} className="p-1 aspect-square">
              <Image
                src={url}
                alt={`Sample project ${index + 1}`}
                width={500}
                height={500}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          ))}

          {service.sampleUrls.length === 0 && (
            <div className="col-span-full border-dashed border-gray-300 text-center py-10">
              <p className="text-gray-400">
                No sample projects available for this service.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}