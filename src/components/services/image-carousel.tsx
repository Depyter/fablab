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
    <div className="group/carousel relative flex h-full min-h-105 w-full flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 w-full h-full">
        {images.map((src, index) => (
          <div
            key={src}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out",
              current === index ? "opacity-100 z-10" : "opacity-0 z-0",
            )}
          >
            <div className="relative h-full w-full p-4 lg:p-8">
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
            className="absolute bottom-3 left-[44%] z-20 flex h-7 w-7 items-center justify-center border border-black bg-background text-foreground transition-colors hover:bg-sidebar-accent"
            aria-label="Previous image"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <button
            onClick={next}
            className="absolute bottom-3 left-[56%] z-20 flex h-7 w-7 items-center justify-center border border-black bg-background text-foreground transition-colors hover:bg-sidebar-accent"
            aria-label="Next image"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 text-[10px] font-semibold tracking-[0.2em] text-foreground/60">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(images.length).padStart(2, "0")}
          </div>

          <div className="sr-only" aria-live="polite">
            Image {current + 1} of {images.length}
          </div>

          <div className="absolute bottom-0 left-0 z-10 h-12 w-full border-t border-black" />

          <div className="absolute bottom-0 left-0 z-0 h-12 w-full bg-background" />

          <div className="hidden">
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
