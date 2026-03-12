"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

interface ServiceGalleryProps {
  images: string[];
}

/**
 * ServiceGallery
 * Inspired by Blue Bottle Coffee's product gallery:
 * - Vertical thumbnail strip on the left (on desktop)
 * - Large, clean main stage on the right
 * - No heavy borders or shadow boxes
 * - Subtle transitions and high-quality "stage" feel
 */
export function ServiceGallery({ images }: ServiceGalleryProps) {
  const [current, setCurrent] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollThumbnails = (direction: "up" | "down") => {
    if (scrollRef.current) {
      const scrollAmount = 100;
      scrollRef.current.scrollBy({
        top: direction === "up" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-6 w-full group/gallery">
      {/* Vertical Thumbnails (Desktop) / Horizontal (Mobile) */}
      {images.length > 1 && (
        <div className="relative flex lg:flex-col items-center gap-2">
          {/* Scroll Up Button (Desktop Only) */}
          <button
            onClick={() => scrollThumbnails("up")}
            className="hidden lg:flex items-center justify-center w-full py-1 text-muted-foreground/40 hover:text-primary transition-colors"
            aria-label="Scroll thumbnails up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto scrollbar-none snap-y snap-mandatory lg:max-h-[450px] pb-2 lg:pb-0"
          >
            {images.map((src, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={cn(
                  "relative shrink-0 aspect-square w-16 lg:w-20 rounded-sm overflow-hidden transition-all duration-300 snap-start",
                  "bg-sidebar-accent/10 border",
                  current === index
                    ? "border-primary/60 opacity-100 shadow-sm"
                    : "border-transparent opacity-40 hover:opacity-100",
                )}
              >
                <Image
                  src={src}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-contain p-2"
                  sizes="80px"
                />
              </button>
            ))}
          </div>

          {/* Scroll Down Button (Desktop Only) */}
          <button
            onClick={() => scrollThumbnails("down")}
            className="hidden lg:flex items-center justify-center w-full py-1 text-muted-foreground/40 hover:text-primary transition-colors"
            aria-label="Scroll thumbnails down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Image Stage */}
      <div className="relative flex-1 aspect-square bg-sidebar-accent/5 rounded-sm overflow-hidden flex items-center justify-center p-8 lg:p-12 border border-sidebar-border/30">
        <div className="relative w-full h-full">
          <Image
            key={images[current]}
            src={images[current]}
            alt="Service main view"
            fill
            className="object-contain transition-all duration-700 ease-in-out"
            sizes="(max-width: 1024px) 100vw, 800px"
            priority
          />
        </div>

        {/* Floating Indicator (Desktop only, minimal) */}
        {images.length > 1 && (
          <div className="absolute bottom-6 right-8 text-[9px] font-black uppercase tracking-[0.3em] text-foreground/20 select-none">
            {current + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
