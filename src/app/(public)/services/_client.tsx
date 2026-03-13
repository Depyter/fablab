"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ServiceCardClient } from "@/components/services/service-card-client";
import { cn } from "@/lib/utils";

/**
 * ServicesListClient
 * Inspired by Blue Bottle Coffee's minimalist "All Coffee" page:
 * - Uses distinct section backgrounds to separate UI parts
 * - Clean, spacious typography
 * - Alternating stage backgrounds for service cards
 */
export function ServicesListClient({
  preloadedServices,
}: {
  preloadedServices: Preloaded<typeof api.services.query.getServices>;
}) {
  const services = usePreloadedQuery(preloadedServices);

  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <header className="py-24 text-center">
          <h1 className="text-sm font-black uppercase tracking-[0.5em] text-foreground/40">
            Our Services
          </h1>
        </header>
        <div className="py-32 bg-sidebar-accent/10 border-y border-sidebar-border/20 text-center">
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[11px]">
            New opportunities are brewing. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {/*
          Section 1: Hero Header
          White background, minimal focus
      */}
      <header className="bg-background py-20 lg:py-32 text-center border-b border-sidebar-border/10">
        <h1 className="text-sm font-black uppercase tracking-[0.6em] text-foreground/30 mb-4">
          Fablab Services
        </h1>
        <div className="h-px w-12 bg-primary/20 mx-auto" />
      </header>

      {/*
          Section 2: Main Grid
          Lightest background to provide subtle contrast from the header
      */}
      <section className="bg-sidebar-accent/5 py-20 lg:py-24">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex items-center justify-between mb-16 border-b border-sidebar-border/30 pb-4">
            <h2 className="text-lg font-black tracking-tight text-foreground uppercase tracking-[0.2em]">
              Digital Fabrication
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {services.length} Options Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
            {services.map((service, index) => {
              // Alternate backgrounds for the cards themselves to sit on the section background
              const cardBgClass =
                index % 2 === 0 ? "bg-primary-muted/40" : "bg-secondary/10";

              return (
                <div
                  key={service._id}
                  className={cn(
                    "group rounded-sm transition-all duration-500",
                    cardBgClass,
                  )}
                >
                  <ServiceCardClient
                    slug={service.slug}
                    imageSrc={service.imageUrls[0] ?? "/fablab_mural.png"}
                    hoverImageSrc={service.imageUrls[1] ?? service.imageUrls[0]}
                    title={service.name}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/*
          Section 3: Call to Action / Support
          Slightly darker stage for contrast
      */}
      <section className="bg-sidebar-accent/15 py-24 border-y border-sidebar-border/20">
        <div className="container mx-auto px-6 max-w-7xl text-center">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-foreground/60 mb-6">
            Custom Projects?
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed mb-10">
            If you have a specialized fabrication requirement not listed above,
            our technicians are ready to assist with custom workflows.
          </p>
          <div className="h-px w-8 bg-primary/30 mx-auto" />
        </div>
      </section>

      {/* Footer minimal section */}
      <footer className="bg-background py-16 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/30">
          Built for Makers at Fablab
        </p>
      </footer>
    </div>
  );
}
