"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ChevronLeft, CirclePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ServiceGallery } from "@/components/services/image-carousel";
import Image from "next/image";
import { BookingDialog } from "@/components/booking/dialog-form";
import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * ServiceDetailClient
 * Refreshed to use the same bold, high-contrast visual language as the landing
 * and services pages while keeping the same service content and booking flow.
 */
export function ServiceDetailClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedQuery(preloadedService);

  useEffect(() => {
    if (!service) return;
    posthog.capture("service_detail_viewed", {
      service_id: service._id,
      service_name: service.name,
      service_type: service.serviceCategory.type,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?._id]);

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
    if (service.serviceCategory.type === "WORKSHOP") {
      return service.serviceCategory.amount;
    }
    return service.serviceCategory.setupFee;
  };

  const getRatePerHour = () => {
    if (service === null) return 0;
    if (service.serviceCategory.type === "WORKSHOP") {
      return service.serviceCategory.amount;
    }

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
  const fabricationDays = getFabricationDays();
  const hasVariants = (service.serviceCategory.variants?.length ?? 0) > 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background font-sans">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-size-[120px_120px] opacity-25" />
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-fab-magenta/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-fab-teal/10 blur-3xl" />

      <header className="relative z-10 border-b-8 border-black bg-background">
        <div className="container mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 sm:py-6">
          <Link href="/services">
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto gap-2 border-0 bg-transparent px-0 py-0 text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Services
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 border-b-8 border-black bg-fab-amber/20">
        <div className="container mx-auto grid max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b-8 border-black bg-background lg:border-b-0 lg:border-r-8">
            <ServiceGallery images={service.imageUrls} />
          </div>

          <div className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center border border-black bg-fab-teal px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white">
                  {service.status}
                </span>
                <span className="inline-flex items-center border border-black bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70">
                  {service.serviceCategory.type}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-black uppercase tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
                  {service.name}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {service.description}
                </p>
              </div>

              {fabricationDays.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-foreground/50">
                    Available Days
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fabricationDays.map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center border border-black bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-foreground/70"
                      >
                        {day.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border-2 border-black bg-background p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/50">
                    Base Price
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    ₱{getBasePrice().toLocaleString()}
                  </p>

                  {service.serviceCategory.type === "WORKSHOP" &&
                  hasVariants ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {service.serviceCategory.variants?.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 border border-black/10 bg-sidebar-accent/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: ₱{variant.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {service.serviceCategory.type === "FABRICATION" &&
                  hasVariants ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {service.serviceCategory.variants?.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 border border-black/10 bg-sidebar-accent/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          <CirclePercent className="h-3 w-3" />
                          {variant.name}: ₱{variant.setupFee.toLocaleString()}{" "}
                          base
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="border-2 border-black bg-background p-4 sm:p-5 sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/50">
                    Rate Per Hour
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    ₱{getRatePerHour().toLocaleString()}
                  </p>

                  {service.serviceCategory.type === "FABRICATION" &&
                  hasVariants ? (
                    <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
                      {service.serviceCategory.variants?.map((variant) => (
                        <span
                          key={variant.name}
                          className="inline-flex items-center gap-1 border border-black/10 bg-sidebar-accent/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
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
            </div>

            <div className="space-y-3">
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
      </section>

      <section className="relative z-10 border-b-8 border-black bg-fab-teal/10">
        <div className="border-b-8 border-black bg-fab-magenta px-6 py-8 text-white">
          <div className="container mx-auto max-w-7xl">
            <p className="text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
              Technical Requirements
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
            <div className="border-2 border-black bg-background p-6 sm:p-8">
              {service.requirements.length > 0 ? (
                <ul className="space-y-4">
                  {service.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 border-b border-black/10 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-black bg-fab-amber text-[10px] font-black uppercase tracking-[0.2em] text-black">
                        0{i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground/80">
                        {req}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No standard requirements.
                </p>
              )}
            </div>

            <div className="border-2 border-black bg-background p-6 sm:p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-foreground/50">
                Need assistance?
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Our lab experts are available to guide you through the
                fabrication process. Contact us for custom consultations.
              </p>
              <div className="mt-8 h-1 w-12 bg-fab-magenta" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b-8 border-black bg-background">
        <div className="border-b-8 border-black bg-fab-amber px-6 py-8">
          <div className="container mx-auto max-w-7xl text-start">
            <p className="text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">
              Project Samples
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
            {service.sampleUrls.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden border border-black bg-sidebar-accent/10"
              >
                <Image
                  src={url}
                  alt={`Sample project ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                />
              </div>
            ))}

            {service.sampleUrls.length === 0 && (
              <div className="col-span-full border border-dashed border-black/20 bg-sidebar-accent/5 py-20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  Gallery coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t-8 border-black bg-background py-16 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/30">
          Built for Makers at Fablab
        </p>
      </footer>
    </main>
  );
}
