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
    | { type: "FIXED"; amount: number; upAmount?: number }
    | {
        type: "PER_UNIT";
        baseFee: number;
        upBaseFee?: number;
        unitName: string;
        ratePerUnit: number;
        upRatePerUnit?: number;
      }
    | {
        type: "COMPOSITE";
        baseFee: number;
        upBaseFee?: number;
        timeRatePerHour: number;
        upTimeRatePerHour?: number;
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
              pricing.upAmount !== undefined
                ? ` (UP: ₱${pricing.upAmount.toFixed(2)})`
                : ""
            }`}
          {pricing.type === "PER_UNIT" &&
            `₱${pricing.baseFee.toFixed(2)} Base + ₱${pricing.ratePerUnit.toFixed(2)}/${pricing.unitName}${
              pricing.upBaseFee !== undefined ||
              pricing.upRatePerUnit !== undefined
                ? " (UP Available)"
                : ""
            }`}
          {pricing.type === "COMPOSITE" &&
            `₱${pricing.baseFee.toFixed(2)} Base + ₱${pricing.timeRatePerHour.toFixed(2)}/hr${
              pricing.upBaseFee !== undefined ||
              pricing.upTimeRatePerHour !== undefined
                ? " (UP Available)"
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
