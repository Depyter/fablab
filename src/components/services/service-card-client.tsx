import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  slug: string;
  imageSrc: string;
  hoverImageSrc?: string;
  title: string;
  imageAlt?: string;
}

/**
 * ServiceCardClient
 * Simplified minimalist aesthetic:
 * - Simple scale-up hover effect for images
 * - No sliding text or complex transformations
 * - Clean, centered typography
 */
export function ServiceCardClient({
  slug,
  imageSrc,
  hoverImageSrc,
  title,
  imageAlt = "Service image",
}: ServiceCardProps) {
  return (
    <Link
      href={`/services/${slug}`}
      className="group flex flex-col items-center text-center w-full"
    >
      {/*
          Image Container:
          - Square aspect ratio
          - Centered image with breathing room
      */}
      <div className="relative aspect-square w-full overflow-hidden flex items-center justify-center p-12">
        {/* Primary Image */}
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={cn(
            "object-contain p-8 transition-all duration-500 ease-in-out group-hover:scale-110",
            hoverImageSrc && "group-hover:opacity-0",
          )}
          priority
        />

        {/* Hover Image (Swaps in if provided) */}
        {hoverImageSrc && (
          <Image
            src={hoverImageSrc}
            alt={`${imageAlt} hover`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-8 opacity-0 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:scale-110"
          />
        )}
      </div>

      {/* Text Content Area */}
      <div className="mt-4 mb-8 space-y-2 w-full max-w-[280px]">
        <h3 className="text-[13px] font-black uppercase tracking-[0.3em] text-foreground/80 transition-colors group-hover:text-primary leading-relaxed">
          {title}
        </h3>

        {/* Static minimalist indicator */}
        <div className="flex flex-col items-center">
          <div className="h-[1px] w-4 bg-sidebar-border group-hover:w-8 group-hover:bg-primary transition-all duration-500 mt-2" />
        </div>
      </div>
    </Link>
  );
}
