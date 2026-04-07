import { Button } from "@/components/ui/button";
import { ManageCard } from "@/components/manage/manage-card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface ServiceCardProps {
  // required
  slug: string;
  imageSrc: string;
  title: string;
  description: string;
  regularPrice: number;
  discountedPrice: number;
  unit: string; // e.g., "per hour", "per item"

  // optional
  imageAlt?: string;
  badgeText?: string;
  badgeVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
  buttonText?: string;
  showBadge?: boolean;
  className?: string;
}

export function ServiceCard({
  slug,
  imageSrc,
  title,
  description,
  regularPrice,
  discountedPrice,
  imageAlt = "Service image",
  badgeText = "Featured",
  badgeVariant = "secondary",
  buttonText = "Edit Service",
  showBadge = true,
  className = "",
  unit = "per unit",
}: ServiceCardProps) {
  return (
    <ManageCard
      className={className}
      title={title}
      subtitle={
        <>
          ₱{regularPrice.toFixed(2)}/{unit} Regular · ₱
          {discountedPrice.toFixed(2)}/{unit} UP Rate
        </>
      }
      description={description}
      coverFallback={
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
      }
      badgeText={showBadge ? badgeText : undefined}
      badgeClassName="bg-secondary/10 text-secondary-foreground border-secondary/20"
      action={
        <Link
          href={`/dashboard/services/${slug}/edit`}
          className="w-full block"
        >
          <Button size="sm" variant="outline" className="w-full h-8 text-xs">
            {buttonText}
          </Button>
        </Link>
      }
    />
  );
}
