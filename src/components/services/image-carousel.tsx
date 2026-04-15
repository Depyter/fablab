"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ServiceGalleryProps {
  images: string[];
}

/**
 * ServiceGallery
 * Inspired by Blue Bottle Coffee's product gallery:
 * - Large, clean main stage
 * - Minimalist horizontal slider with pagination underneath
 */
export function ServiceGallery({ images }: ServiceGalleryProps) {
  const [current, setCurrent] = React.useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  if (!images || images.length === 0) return null;

  return (
    <div className="group/carousel relative flex flex-col items-center justify-center w-full aspect-square bg-sidebar-accent/5 overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        {images.map((src, index) => (
          <div
            key={src}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out",
              current === index ? "opacity-100 z-10" : "opacity-0 z-0",
            )}
          >
            <div className="relative w-full h-full p-8 lg:p-12">
              <Image
                src={src}
                alt={`Product Image ${index + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 800px"
                priority={index === 0}
              />
            </div>
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute -left-8 group-hover/carousel:-left-0.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-6 lg:w-12 lg:h-8 bg-background border border-border text-foreground transition-all duration-500 hover:bg-sidebar-accent opacity-0 group-hover/carousel:opacity-100"
            aria-label="Previous image"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <button
            onClick={next}
            className="absolute -right-8 group-hover/carousel:-right-0.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-6 lg:w-12 lg:h-8 bg-background border border-border text-foreground transition-all duration-500 hover:bg-sidebar-accent opacity-0 group-hover/carousel:opacity-100"
            aria-label="Next image"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={cn(
                  "text-sm font-sans transition-all",
                  current === idx
                    ? "font-black text-foreground opacity-100"
                    : "font-medium text-muted-foreground opacity-60 hover:opacity-100",
                )}
                aria-label={`Go to slide ${idx + 1}`}
              >
                {String(idx + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
