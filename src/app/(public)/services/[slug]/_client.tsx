"use client";

import { useState, useEffect } from "react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
  ChevronLeft,
  HelpCircle,
  PhilippinePeso,
  CirclePercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ServiceGallery } from "@/components/services/image-carousel";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (service === null) {
    return (
      <main className="container mx-auto max-w-7xl px-6 py-24 text-center font-sans">
        <p className="text-sm font-black uppercase tracking-[0.4em] text-foreground/40">
          Service Not Found
        </p>
      </main>
    );
  }

  return (
    <main className="font-sans bg-background min-h-screen">
      {/*
          Section 1: Hero Header & Main Info
          White background, minimal focus
      */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 px-6",
          isScrolled
            ? "bg-background/90 backdrop-blur-md py-4 border-b border-sidebar-border/30"
            : "bg-transparent py-8",
        )}
      >
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
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
          <div
            className={cn(
              "transition-opacity duration-300",
              isScrolled ? "opacity-100" : "opacity-0",
            )}
          >
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">
              {service.name}
            </h2>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <div className="bg-primary-muted">
        <div className="container mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-start">
            {/* Left: Media Gallery */}
            <div className="lg:col-span-7">
              <ServiceGallery images={service.imageUrls} />
            </div>

            {/* Right: Product Content */}
            <div className="lg:col-span-5 flex flex-col pt-0">
              <div className="mb-10">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-3 block">
                  {service.status}
                </span>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground mb-6">
                  {service.name}
                </h1>
                <div className="h-px w-12 bg-primary/30 mb-8" />
                <p className="text-base text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>

              {/* Pricing Section */}
              <div className="border-t border-sidebar-border/30 pt-10 mb-12">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5">
                      <PhilippinePeso className="h-3 w-3" />
                      Regular Rate
                    </h4>
                    <p className="text-xl font-black tracking-tight">
                      ₱{service.regularPrice.toLocaleString()}
                      <span className="text-xs font-bold text-muted-foreground ml-1">
                        /{service.unitPrice}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2 flex items-center gap-1.5">
                      <CirclePercent className="h-3 w-3" />
                      UP Rate
                    </h4>
                    <p className="text-xl font-black tracking-tight text-primary">
                      ₱{service.upPrice.toLocaleString()}
                      <span className="text-xs font-bold text-muted-foreground/60 ml-1">
                        /{service.unitPrice}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-10 w-full">
                <BookingDialog
                  serviceId={service._id}
                  serviceName={service.name}
                  requirements={service.requirements}
                  fileTypes={service.fileTypes ?? []}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="h-4 w-4 text-primary/60" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Need assistance?
                  </h3>
                </div>
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
