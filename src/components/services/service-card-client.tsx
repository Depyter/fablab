"use client";

import Link from "next/link";
import posthog from "posthog-js";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  slug: string;
  title: string;
  serviceType: "FABRICATION" | "WORKSHOP";
  imageUrl?: string | null;
}

export function ServiceCardClient({
  slug,
  title,
  serviceType,
  imageUrl,
}: ServiceCardProps) {
  const isWorkshop = serviceType === "WORKSHOP";

  return (
    <Link
      href={`/services/${slug}`}
      className={cn(
        "group block h-full border-3 border-black rounded-none transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000000]",
        isWorkshop
          ? "bg-fab-teal/95 text-white hover:bg-fab-teal"
          : "bg-fab-magenta/95 text-white hover:bg-fab-magenta",
      )}
      onClick={() =>
        posthog.capture("service_card_clicked", {
          service_slug: slug,
          service_name: title,
          service_type: serviceType,
        })
      }
    >
      <div className="flex h-full min-h-60 flex-col rounded-none p-6 sm:p-7">
        {isWorkshop && imageUrl ? (
          <div className="relative mb-5 aspect-16/10 w-full overflow-hidden border-2 border-black rounded-none bg-black/10">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            />
          </div>
        ) : null}

        <div className="mt-auto">
          <h3
            className={cn(
              "font-black uppercase leading-none tracking-tight",
              isWorkshop ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl",
            )}
          >
            {title}
          </h3>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] opacity-90">
            View Service
          </p>
        </div>
      </div>
    </Link>
  );
}
