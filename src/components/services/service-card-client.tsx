import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  slug: string;
  imageSrc: string;
  hoverImageSrc?: string;
  title: string;
  categoryLabel?: string;
  priceLabel?: string;
  badgeLabel?: string;
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

  badgeLabel = "Featured",
  imageAlt = "Service image",
}: ServiceCardProps) {
  return (
    <Link
      href={`/services/${slug}`}
      className="group flex h-full min-w-100 flex-col bg-background border-r border-b border-black"
    >
      <div className="relative h-65 w-full overflow-hidden border-b border-black">
        <span className="absolute right-3 top-3 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-black bg-background text-[10px] leading-none">
          ♥
        </span>

        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={cn(
            "object-contain p-10 transition-all duration-500 ease-in-out group-hover:scale-105",
            hoverImageSrc && "group-hover:opacity-0",
          )}
          priority
        />

        {hoverImageSrc && (
          <Image
            src={hoverImageSrc}
            alt={`${imageAlt} hover`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-10 opacity-0 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:scale-105"
          />
        )}

      </div>

      <div className="relative px-4 pb-4 pt-6">
        <span className="absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-black px-4 py-0.75 text-[8px] font-bold uppercase tracking-[0.18em] text-white">
          {badgeLabel}
        </span>
       

        <div className="flex items-end justify-between gap-2">
          <h3 className="font-serif text-[31px] leading-[1.02] font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>

          
        </div>
      </div>
    </Link>
  );
}
