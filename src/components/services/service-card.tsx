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
  pricing:
    | {
        type: "FIXED";
        amount: number;
        variants?: Array<{ name: string; amount: number }>;
      }
    | {
        type: "PER_UNIT";
        setupFee: number;
        unitName: string;
        ratePerUnit: number;
        variants?: Array<{
          name: string;
          setupFee: number;
          ratePerUnit: number;
        }>;
      }
    | {
        type: "COMPOSITE";
        setupFee: number;
        unitName: string;
        timeRate: number;
        variants?: Array<{ name: string; setupFee: number; timeRate: number }>;
      };

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
  pricing,
  imageAlt = "Service image",
  badgeText = "Featured",
  badgeVariant = "secondary",
  buttonText = "Edit Service",
  showBadge = true,
  className = "",
}: ServiceCardProps) {
  return (
    <ManageCard
      className={className}
      title={title}
      subtitle={
        <>
          {pricing.type === "FIXED" &&
            `₱${pricing.amount.toFixed(2)} Fixed${
              pricing.variants && pricing.variants.length > 0
                ? ` (+${pricing.variants.length} variant${pricing.variants.length > 1 ? "s" : ""})`
                : ""
            }`}
          {pricing.type === "PER_UNIT" &&
            `₱${(pricing.setupFee ?? (pricing as unknown as { baseFee: number }).baseFee ?? 0).toFixed(2)} Setup + ₱${pricing.ratePerUnit.toFixed(2)}/${pricing.unitName}${
              pricing.variants && pricing.variants.length > 0
                ? ` (+${pricing.variants.length} variant${pricing.variants.length > 1 ? "s" : ""})`
                : ""
            }`}
          {pricing.type === "COMPOSITE" &&
            `₱${(pricing.setupFee ?? (pricing as unknown as { baseFee: number }).baseFee ?? 0).toFixed(2)} Setup + ₱${pricing.timeRate.toFixed(2)}/${pricing.unitName}${
              pricing.variants && pricing.variants.length > 0
                ? ` (+${pricing.variants.length} variant${pricing.variants.length > 1 ? "s" : ""})`
                : ""
            }`}
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
