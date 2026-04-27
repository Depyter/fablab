"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { CtaSection } from "@/components/cta-section";
import { ServiceCardClient } from "@/components/services/service-card-client";
import { useEffect } from "react";
import posthog from "posthog-js";

export function ServicesListClient({
  preloadedServices,
}: {
  preloadedServices: Preloaded<typeof api.services.query.getServices>;
}) {
  const services = usePreloadedQuery(preloadedServices);

  const fabricationServices = services.filter(
    (service) => service.serviceCategory?.type === "FABRICATION",
  );
  const workshopServices = services.filter(
    (service) => service.serviceCategory?.type === "WORKSHOP",
  );

  useEffect(() => {
    posthog.capture("service_list_viewed", {
      fabrication_count: fabricationServices.length,
      workshop_count: workshopServices.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (services.length === 0) {
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
        {fabricationServices.length > 0 && (
          <section className="border-t-8 border-black bg-background">
            <div className="bg-fab-magenta p-8 text-white border-b-8 border-black sm:p-14 lg:p-20">
              <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
                Digital Fabrication
              </h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
              <div className="relative z-10 mx-auto grid max-w-6xl gap-5 p-5 sm:p-8 md:grid-cols-2 lg:gap-7 lg:p-10">
                {fabricationServices.map((service) => (
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
        {workshopServices.length > 0 && (
          <section className="bg-background">
            <div className="bg-fab-amber p-8 text-black border-y-8 border-black sm:p-14 lg:p-20">
              <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
                Workshops
              </h2>
            </div>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-35" />
              <div className="relative z-10 mx-auto grid max-w-6xl gap-5 p-5 sm:p-8 md:grid-cols-2 lg:gap-7 lg:p-10">
                {workshopServices.map((service) => (
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
