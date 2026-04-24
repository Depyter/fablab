"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  slug: string;
  title: string;
  showBorderRight?: boolean;
  showBorderBottom?: boolean;
  hoverColor?: string;
}

export function ServiceCardClient({
  slug,
  title,
  showBorderRight = true,
  showBorderBottom = true,
  hoverColor = "hover:bg-fab-amber",
}: ServiceCardProps) {
  return (
    <Link
      href={`/services/${slug}`}
      className={cn(
        "group flex flex-col bg-background transition-colors",
        hoverColor,
        showBorderRight && "md:border-r-8 border-black",
        showBorderBottom && "border-b-8 border-black",
      )}
      onClick={() =>
        posthog.capture("service_card_clicked", {
          service_slug: slug,
          service_name: title,
        })
      }
    >
      <div className="flex min-h-[250px] flex-1 items-center justify-between gap-6 px-6 py-12 sm:min-h-[400px] sm:p-10 lg:min-h-[500px] lg:p-24">
        <h3 className="text-4xl font-black uppercase tracking-tighter text-black transition-colors group-hover:text-white leading-none sm:text-6xl lg:text-8xl">
          {title}
        </h3>
        <div className="flex items-center text-black transition-colors group-hover:text-white">
          <ChevronRight
            className="h-12 w-12 transition-transform duration-150 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-4 sm:h-20 sm:w-20 lg:h-28 lg:w-28"
            strokeWidth={8}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <ChevronRight
            className="h-12 w-12 -ml-6 transition-transform duration-150 delay-75 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-4 opacity-60 sm:h-20 sm:w-20 sm:-ml-8 lg:h-28 lg:w-28 lg:-ml-10"
            strokeWidth={8}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <ChevronRight
            className="h-12 w-12 -ml-6 transition-transform duration-150 delay-150 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-4 opacity-30 sm:h-20 sm:w-20 sm:-ml-8 lg:h-28 lg:w-28 lg:-ml-10"
            strokeWidth={8}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </div>
      </div>
    </Link>
  );
}
