"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { CtaSection } from "@/components/cta-section";
import { ServiceCardClient } from "@/components/services/service-card-client";
import { useEffect, useMemo } from "react";
import posthog from "posthog-js";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ServiceCardSkeleton({ isWorkshop }: { isWorkshop: boolean }) {
  return (
    <div
      className={cn(
        "h-full min-h-60 border-3 border-black p-6 sm:p-7",
        isWorkshop ? "bg-fab-teal/20" : "bg-fab-magenta/20",
      )}
    >
      <div className="flex h-full flex-col">
        {isWorkshop && (
          <Skeleton className="mb-5 aspect-16/10 w-full rounded-none bg-black/10" />
        )}
        <div className="mt-auto space-y-3">
          <Skeleton
            className={cn(
              "h-10 w-3/4 rounded-none bg-black/10",
              isWorkshop ? "sm:h-12" : "sm:h-14",
            )}
          />
          <Skeleton className="h-4 w-24 rounded-none bg-black/10" />
        </div>
      </div>
    </div>
  );
}

export function ServicesListClient() {
  const services = useQuery(api.services.query.getServices);

  const fabricationServices = useMemo(
    () =>
      services?.filter(
        (service) => service.serviceCategory?.type === "FABRICATION",
      ) ?? [],
    [services],
  );

  const workshopServices = useMemo(
    () =>
      services?.filter(
        (service) => service.serviceCategory?.type === "WORKSHOP",
      ) ?? [],
    [services],
  );

  useEffect(() => {
    if (services) {
      posthog.capture("service_list_viewed", {
        fabrication_count: fabricationServices.length,
        workshop_count: workshopServices.length,
      });
    }
  }, [services, fabricationServices.length, workshopServices.length]);

  const isLoading = services === undefined;

  if (!isLoading && services.length === 0) {
    return (
      <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center p-12">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
        <h1 className="relative z-10 text-6xl font-black uppercase tracking-tighter sm:text-8xl">
          Coming Soon
        </h1>
        <p className="relative z-10 mt-6 text-2xl font-bold uppercase tracking-tighter">
          New opportunities are brewing.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-10">
        {/* Hero Header */}
        <header className="bg-fab-teal py-28 text-center text-white lg:py-52">
          <h1 className="text-6xl font-black uppercase tracking-tighter sm:text-8xl lg:text-[10rem]">
            SERVICES
          </h1>
        </header>

        {/* Digital Fabrication Section */}
        {(isLoading || fabricationServices.length > 0) && (
          <section className="border-t-8 border-black bg-background">
            <div className="bg-fab-magenta p-8 text-white border-b-8 border-black sm:p-14 lg:p-20">
              <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
                Digital Fabrication
              </h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
              <div className="relative z-10 mx-auto grid max-w-6xl gap-5 p-5 sm:p-8 md:grid-cols-2 lg:gap-7 lg:p-10">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <ServiceCardSkeleton key={i} isWorkshop={false} />
                    ))
                  : fabricationServices.map((service) => (
                      <ServiceCardClient
                        key={service._id}
                        slug={service.slug}
                        title={service.name}
                        serviceType="FABRICATION"
                      />
                    ))}
              </div>
            </div>
          </section>
        )}

        {/* Workshop Section */}
        {(isLoading || workshopServices.length > 0) && (
          <section className="bg-background">
            <div className="bg-fab-amber p-8 text-black border-y-8 border-black sm:p-14 lg:p-20">
              <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
                Workshops
              </h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
              <div className="relative z-10 mx-auto grid max-w-6xl gap-5 p-5 sm:p-8 md:grid-cols-2 lg:gap-7 lg:p-10">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <ServiceCardSkeleton key={i} isWorkshop={true} />
                    ))
                  : workshopServices.map((service) => (
                      <ServiceCardClient
                        key={service._id}
                        slug={service.slug}
                        title={service.name}
                        serviceType="WORKSHOP"
                      />
                    ))}
              </div>
            </div>
          </section>
        )}

        {/* Call to Action */}
        <CtaSection
          title="Custom Projects?"
          description="If you have a specialized requirement not listed above, our technicians are ready to assist with custom workflows."
          buttonLabel="Get in Touch"
        />
      </div>
    </div>
  );
}
