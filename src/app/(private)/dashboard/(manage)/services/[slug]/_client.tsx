"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { api } from "@convex/_generated/api";
import { Preloaded } from "convex/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PhilippinePeso, CirclePercent } from "lucide-react";
import { ActionDialog } from "@/components/action-dialog";
import { useMutation } from "convex/react";
import { PriceTile } from "@/components/services/price-tile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ServiceGallery } from "@/components/services/image-carousel";
import Image from "next/image";
import { toast } from "sonner";

export function ServiceDetailClient({
  preloadedService,
}: {
  preloadedService: Preloaded<typeof api.services.query.getService>;
}) {
  const service = usePreloadedAuthQuery(preloadedService);
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
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Service not found
          </h1>
        </div>
      </main>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromise = deleteService({ service: service._id });
      toast.promise(deletePromise, {
        loading: "Deleting service...",
        success: "Service deleted successfully!",
        error: "Failed to delete service. Please try again.",
      });
      await deletePromise;
      router.push("/dashboard/services");
    } catch (error) {
      console.error("Failed to delete service:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPricingDisplays = (pricing: typeof service.pricing) => {
    const displays = [];

    if (pricing.type === "FIXED") {
      displays.push({
        label: "Regular Price",
        price: pricing.amount,
        unit: "fixed",
        isUp: false,
      });
      if (pricing.variants) {
        for (const variant of pricing.variants) {
          displays.push({
            label: `${variant.name} Price`,
            price: variant.amount,
            unit: "fixed",
            isUp: true,
          });
        }
      }
    } else if (pricing.type === "PER_UNIT") {
      displays.push({
        label: "Regular Base",
        price: pricing.setupFee,
        unit: "base",
        isUp: false,
      });
      displays.push({
        label: "Regular Rate",
        price: pricing.ratePerUnit,
        unit: pricing.unitName,
        isUp: false,
      });
      if (pricing.variants) {
        for (const variant of pricing.variants) {
          displays.push({
            label: `${variant.name} Base`,
            price: variant.setupFee,
            unit: "base",
            isUp: true,
          });
          displays.push({
            label: `${variant.name} Rate`,
            price: variant.ratePerUnit,
            unit: pricing.unitName,
            isUp: true,
          });
        }
      }
    } else if (pricing.type === "COMPOSITE") {
      displays.push({
        label: "Regular Base",
        price: pricing.setupFee,
        unit: "base",
        isUp: false,
      });
      displays.push({
        label: "Regular Time Rate",
        price: pricing.timeRate,
        unit: pricing.unitName,
        isUp: false,
      });
      if (pricing.variants) {
        for (const variant of pricing.variants) {
          displays.push({
            label: `${variant.name} Base`,
            price: variant.setupFee,
            unit: "base",
            isUp: true,
          });
          displays.push({
            label: `${variant.name} Time Rate`,
            price: variant.timeRate,
            unit: pricing.unitName,
            isUp: true,
          });
        }
      }
    }

    return displays;
  };

  const pricingDisplays = getPricingDisplays(service.pricing);

  return (
    <main className="container mx-auto max-w-6xl pb-24">
      {/* Sticky Header Navigation */}
      <header
        className={`sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b transition-all duration-300 -mx-4 px-4 sm:mx-0 sm:px-8 py-4 mb-8
          ${isScrolled ? "border-gray-200 shadow-sm" : "border-transparent"}`}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/services">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text">
              {service.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/services/${service.slug}/edit`}>
              <Button variant="outline" className="hidden sm:flex rounded-full">
                Edit Service
              </Button>
            </Link>
            <ActionDialog
              title="Delete Service"
              description={`Are you sure you want to delete "${service.name}"? This action cannot be undone.`}
              onConfirm={handleDelete}
              baseActionText="Delete"
              className="bg-red-500 hover:bg-red-600 text-white border-transparent"
              confirmButtonText="Delete"
            />
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Content - Gallery */}
          <div className="lg:col-span-5 space-y-4">
            <ServiceGallery images={service.imageUrls} />
          </div>

          {/* Right Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pricingDisplays.map((display, idx) => (
                <PriceTile
                  key={idx}
                  label={display.label}
                  price={display.price}
                  unit={display.unit}
                  icon={
                    display.isUp ? (
                      <CirclePercent className="h-6 w-6 text-gray-200" />
                    ) : (
                      <div className="border-gray-200 rounded-full border-2 w-6 h-6 items-center p-0.5 justify-center align-middle">
                        <PhilippinePeso className="h-4 w-4 text-gray-200 stroke-2.5" />
                      </div>
                    )
                  }
                />
              ))}
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
                  <p className="text-gray-500 text-sm italic">
                    No special requirements.
                  </p>
                )}
              </section>

              {service.sampleUrls.length > 0 && (
                <section className="mt-10">
                  <h3 className="text-lg font-bold mb-3">Sample Outputs</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {service.sampleUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-100"
                      >
                        <Image
                          src={url}
                          alt={`Sample ${i + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
