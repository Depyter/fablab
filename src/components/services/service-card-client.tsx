"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { ChevronRight } from "lucide-react";
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
}: ServiceCardProps) {
  const isWorkshop = serviceType === "WORKSHOP";

  return (
    <Link
      href={`/services/${slug}`}
      className={cn(
        "group relative block h-full overflow-hidden rounded-[2rem] border-4 border-black transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#000000] md:hover:shadow-[10px_10px_0_0_#000000] focus-visible:-translate-y-1 focus-visible:shadow-[5px_5px_0_0_#000000] md:focus-visible:shadow-[10px_10px_0_0_#000000] focus-visible:outline-none",
        isWorkshop ? "bg-fab-teal text-white" : "bg-fab-magenta text-white",
      )}
      onClick={() =>
        posthog.capture("service_card_clicked", {
          service_slug: slug,
          service_name: title,
          service_type: serviceType,
        })
      }
    >
      <div className="relative flex h-full min-h-20 items-center justify-center p-3 sm:min-h-40 sm:p-6">
        <div className="flex items-center justify-center gap-1 sm:gap-3">
          <h3
            className={cn(
              "max-w-[10ch] font-black uppercase leading-[0.9] tracking-[-0.06em]",
              isWorkshop
                ? "text-xl sm:text-5xl lg:text-[3.5rem]"
                : "text-2xl sm:text-6xl lg:text-[4rem]",
            )}
          >
            {title}
          </h3>

          <div className="flex shrink-0 items-center">
            <ChevronRight
              className="size-5 transition-transform duration-150 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2 group-focus-visible:translate-x-2 sm:size-10"
              strokeWidth={5}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <ChevronRight
              className="-ml-3 size-5 opacity-60 transition-transform duration-150 delay-75 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2 group-focus-visible:translate-x-2 sm:size-10"
              strokeWidth={5}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
