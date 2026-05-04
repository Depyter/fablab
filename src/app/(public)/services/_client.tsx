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
        "h-full min-h-20 rounded-[2rem] border-4 border-black p-3 shadow-[8px_8px_0_0_#000] sm:min-h-40 sm:p-6",
        isWorkshop ? "bg-fab-teal/20" : "bg-fab-magenta/20",
      )}
    >
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center justify-center gap-2">
          <Skeleton
            className={cn(
              "h-7 w-24 rounded-none bg-black/10 sm:h-16",
              isWorkshop ? "sm:w-52" : "sm:w-60",
            )}
          />
          <Skeleton className="h-5 w-7 rounded-full bg-black/10 sm:h-8 sm:w-10" />
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
        <header className="bg-fab-teal py-20 text-center text-white sm:py-24 lg:py-32">
          <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl lg:text-[8rem]">
            SERVICES
          </h1>
        </header>

        {/* Digital Fabrication Section */}
        {(isLoading || fabricationServices.length > 0) && (
          <section className="border-t-8 border-black bg-background">
            <div className="border-b-8 border-black bg-fab-magenta px-6 py-6 text-white sm:px-10 sm:py-8 lg:px-14 lg:py-10">
              <h2 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl lg:text-5xl">
                Digital Fabrication
              </h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
              <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-2 p-2 sm:p-6 lg:gap-5 lg:p-8">
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
            <div className="border-y-8 border-black bg-fab-amber px-6 py-6 text-black sm:px-10 sm:py-8 lg:px-14 lg:py-10">
              <h2 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl lg:text-5xl">
                Workshops
              </h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
              <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-2 p-2 sm:p-6 lg:gap-5 lg:p-8">
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
