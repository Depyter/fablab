"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ChevronLeft, CirclePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ServiceGallery } from "@/components/services/image-carousel";
import Image from "next/image";
import { BookingDialog } from "@/components/booking/dialog-form";

/**
 * ServiceDetailClient
 * Inspired by Blue Bottle Coffee's minimalist product page:
 * - Uses distinct section backgrounds to separate UI parts
 * - Clean, spacious typography
 * - High-precision layout
 */
export function ServiceDetailClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedQuery(preloadedService);

  const sortedFabricationDays =
    service?.serviceCategory.type === "FABRICATION"
      ? [...(service.serviceCategory.availableDays ?? [])].sort((a, b) => a - b)
      : [];

  const getFabricationDays = () => {
    return sortedFabricationDays.map((day) => {
      if (day === 1) return "Monday";
      if (day === 2) return "Tuesday";
      if (day === 3) return "Wednesday";
      if (day === 4) return "Thursday";
      if (day === 5) return "Friday";
      if (day === 6) return "Saturday";
      if (day === 0) return "Sunday";
      return "Unknown";
    });
  };

  const getBasePrice = () => {
    if (service === null) return 0;
    if (service.serviceCategory.type === "WORKSHOP")
      return service.serviceCategory.amount;
    return service.serviceCategory.setupFee;
  };

  const getRatePerHour = () => {
    if (service === null) return 0;
    if (service.serviceCategory.type === "WORKSHOP")
      return service.serviceCategory.amount;
    const rawRate = service.serviceCategory.timeRate;
    const unitName = service.serviceCategory.unitName;
    if (unitName === "minute") return rawRate * 60;
    if (unitName === "day") return rawRate / 24;
    return rawRate;
  };

  if (service === null) {
    return (
      <main className="container mx-auto max-w-7xl px-6 py-24 text-center font-sans">
        <p className="text-sm font-black uppercase tracking-[0.4em] text-foreground/40">
          Service Not Found
        </p>
      </main>
    );
  }

  const fabricationUnitName =
    service.serviceCategory.type === "FABRICATION"
      ? service.serviceCategory.unitName
      : null;

  return (
    <main className="min-h-screen bg-background font-sans">
      <header className="px-6 py-8">
        <div className="container mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/services">
            <Button
              variant="ghost"
              size="sm"
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary p-0 bg-transparent hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Services
            </Button>
          </Link>
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/70">
            {service.name}
          </h2>
          <div className="w-24" />
        </div>
      </header>

      <section className="px-6 pb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-stretch border border-black bg-background lg:grid-cols-2">
            <div className="border-b border-black lg:border-b-0 lg:border-r">
              <ServiceGallery images={service.imageUrls} />
            </div>

            <div className="flex h-full flex-col p-6 sm:p-8">
              <div className="mb-6">
                <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.35em] text-foreground/60">
                  {service.status}
                </span>
                
                <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-foreground lg:text-4xl">
                  {service.name}
                </h1>

                <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.35em] text-foreground/60">
                  {getFabricationDays().length > 0
                    ? getFabricationDays().map((day) => 
                      <div key={day} className="inline-flex items-center gap-1 border bg-sidebar-accent/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground mr-2">
                        {day.slice(0, 3).toUpperCase()}
                      </div>
                        
                    )
                    : ""}
                </span>
              </div>

              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>

              <div className="mb-8 -mx-6 grid grid-cols-2 border-y border-black sm:-mx-8">
                <div className="border-r border-black p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                    Base Price
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight">
                    ₱{getBasePrice().toLocaleString()}
                  </p>

                  {service.serviceCategory.type === "WORKSHOP" &&
                  service.serviceCategory.variants?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {service.serviceCategory.variants.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 rounded-full bg-sidebar-accent/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: ₱{variant.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {service.serviceCategory.type === "FABRICATION" &&
                  service.serviceCategory.variants?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {service.serviceCategory.variants.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 rounded-full bg-sidebar-accent/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: ₱{variant.setupFee.toLocaleString()}{" "}
                          base
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="p-4 text-right sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                    Rate Per Hour
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight">
                    ₱{getRatePerHour().toLocaleString()}
                  </p>

                  {service.serviceCategory.type === "WORKSHOP" &&
                  service.serviceCategory.variants?.length ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                      {service.serviceCategory.variants.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 rounded-full bg-sidebar-accent/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: ₱{variant.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {service.serviceCategory.type === "FABRICATION" &&
                  service.serviceCategory.variants?.length ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                      {service.serviceCategory.variants.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 rounded-full bg-sidebar-accent/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: ₱{variant.timeRate.toLocaleString()}/
                          {fabricationUnitName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 flex w-full gap-3">
                <BookingDialog
                  serviceId={service._id}
                  serviceName={service.name}
                  requirements={service.requirements}
                  fileTypes={service.fileTypes ?? []}
                  availableDays={
                    service.serviceCategory.type === "FABRICATION"
                      ? sortedFabricationDays
                      : []
                  }
                  serviceMaterials={service.materialDetails ?? []}
                  hasUpPricing={
                    (service.serviceCategory.variants?.length ?? 0) > 0
                  }
                  pricingVariants={
                    (service.serviceCategory.variants ?? []) as Array<{
                      name: string;
                    }>
                  }
                  servicePricing={
                    service.serviceCategory.type === "WORKSHOP"
                      ? {
                          type: "WORKSHOP",
                          amount: service.serviceCategory.amount,
                          variants: service.serviceCategory.variants,
                        }
                      : {
                          type: "FABRICATION",
                          setupFee: service.serviceCategory.setupFee,
                          unitName: service.serviceCategory.unitName,
                          timeRate: service.serviceCategory.timeRate,
                          variants: service.serviceCategory.variants,
                        }
                  }
                  serviceCategory={service.serviceCategory.type}
                  schedules={
                    service.serviceCategory.type === "WORKSHOP"
                      ? service.serviceCategory.schedules
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
          Section 2: Detailed Specs / Requirements
          Subtle sidebar-accent stage to separate technical details
      */}
      <section className="bg-sidebar-accent/5 border-y border-sidebar-border/20 py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em]">
                  Technical Requirements
                </h3>
              </div>
              {service.requirements.length > 0 ? (
                <ul className="space-y-6">
                  {service.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-4 text-sm text-muted-foreground pb-6 border-b border-sidebar-border/30 last:border-0"
                    >
                      <span className="text-[10px] font-black text-primary/40">
                        0{i + 1}
                      </span>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No standard requirements.
                </p>
              )}
            </div>
            <div className="lg:col-span-5">
              <section className="bg-background p-10 rounded-sm border border-sidebar-border/30 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                  Need assistance?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Our lab experts are available to guide you through the
                  fabrication process. Contact us for custom consultations.
                </p>
                <div className="h-px w-8 bg-primary/30" />
              </section>
            </div>
          </div>
        </div>
      </section>

      {/*
          Section 3: Project Samples
          Light secondary-colored stage for visual variety
      */}
      <section className="border-t border-sidebar-border/10 pt-24 pb-32">
        <div className="container mx-auto max-w-7xl px-6">
          <header className="mb-16 text-center">
            <h2 className="text-xs font-black uppercase tracking-[0.5em] text-foreground/40 mb-4">
              Project Samples
            </h2>
            <div className="h-px w-8 bg-primary/20 mx-auto" />
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {service.sampleUrls.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square bg-sidebar-accent/10 overflow-hidden"
              >
                <Image
                  src={url}
                  alt={`Sample project ${index + 1}`}
                  fill
                  className="object-cover transition-opacity duration-700 hover:opacity-80"
                />
              </div>
            ))}

            {service.sampleUrls.length === 0 && (
              <div className="col-span-full py-20 text-center bg-sidebar-accent/5 border border-dashed border-sidebar-border/30 rounded-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                  Gallery coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer minimal section */}
      <footer className="bg-background py-16 text-center border-t border-sidebar-border/10">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/30">
          Built for Makers at Fablab
        </p>
      </footer>
    </main>
  );
}
