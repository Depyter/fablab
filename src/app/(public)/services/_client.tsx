"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
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
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_2px,transparent_2px),linear-gradient(to_bottom,var(--border)_2px,transparent_2px)] bg-[size:80px_80px] opacity-25" />
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
      {/* Heavy Grid Background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_2px,transparent_2px),linear-gradient(to_bottom,var(--border)_2px,transparent_2px)] bg-[size:80px_80px] opacity-25" />

      <div className="relative z-10">
        {/* Hero Header */}
        <header className="bg-fab-teal py-32 text-center text-white lg:py-64">
          <h1 className="text-7xl font-black uppercase tracking-tighter sm:text-9xl lg:text-[12rem]">
            SERVICES
          </h1>
        </header>

        {/* Digital Fabrication Section */}
        {fabricationServices.length > 0 && (
          <section className="bg-background">
            <div className="bg-fab-magenta p-10 text-white border-y-8 border-black sm:p-20 lg:p-32">
              <h2 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl lg:text-9xl">
                Digital Fabrication
              </h2>
            </div>
            <div className="grid md:grid-cols-2">
              {fabricationServices.map((service, index) => {
                const isLastInRow = index % 2 === 1;
                const isLastInCol =
                  index >=
                  fabricationServices.length -
                    (fabricationServices.length % 2 || 2);

                return (
                  <ServiceCardClient
                    key={service._id}
                    slug={service.slug}
                    title={service.name}
                    showBorderRight={!isLastInRow}
                    showBorderBottom={!isLastInCol}
                    hoverColor="hover:bg-fab-magenta hover:text-white"
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Workshop Section */}
        {workshopServices.length > 0 && (
          <section className="bg-background">
            <div className="bg-fab-amber p-10 text-black border-y-8 border-black sm:p-20 lg:p-32">
              <h2 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl lg:text-9xl">
                Workshops
              </h2>
            </div>
            <div className="grid md:grid-cols-2">
              {workshopServices.map((service, index) => {
                const isLastInRow = index % 2 === 1;
                const isLastInCol =
                  index >=
                  workshopServices.length - (workshopServices.length % 2 || 2);

                return (
                  <ServiceCardClient
                    key={service._id}
                    slug={service.slug}
                    title={service.name}
                    showBorderRight={!isLastInRow}
                    showBorderBottom={!isLastInCol}
                    hoverColor="hover:bg-fab-amber hover:text-black"
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="bg-fab-purple p-16 text-center text-white border-t-8 border-black sm:p-32 lg:p-64">
          <h3 className="text-5xl font-black uppercase tracking-tighter sm:text-8xl">
            Custom Projects?
          </h3>
          <p className="mx-auto mt-8 max-w-4xl text-2xl font-bold leading-tight sm:mt-12 lg:text-4xl">
            If you have a specialized requirement not listed above, our
            technicians are ready to assist with custom workflows.
          </p>
          <div className="mt-12 sm:mt-24">
            <button className="border-4 border-black bg-white px-12 py-6 text-2xl font-black uppercase tracking-tighter text-black transition-transform hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 sm:px-24 sm:py-10 sm:text-4xl">
              Get in Touch
            </button>
          </div>
        </section>

        <footer className="bg-background py-20 text-center border-t-8 border-black sm:py-32 lg:py-48">
          <p className="text-2xl font-black uppercase tracking-tighter text-foreground sm:text-3xl">
            FabLab UP Cebu • Built for Makers
          </p>
        </footer>
      </div>
    </div>
  );
}
