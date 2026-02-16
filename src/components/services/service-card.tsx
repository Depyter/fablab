import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ServiceCardProps {
    // required
    imageSrc: string;
    title: string;
    description: string;
    regularPrice: number;
    discountedPrice: number;
    unit: string; // e.g., "per hour", "per item"

    // optional
    imageAlt?: string;
    badgeText?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
    onButtonClick?: () => void;
    buttonText?: string;
    showBadge?: boolean;
    className?: string;
}

export function ServiceCard({
    imageSrc,
    title,
    description,
    regularPrice,
    discountedPrice,
    imageAlt = "Service image",
    badgeText = "Featured",
    badgeVariant = "secondary",
    onButtonClick,
    buttonText = "View Service",
    showBadge = true,
    className = "",
    unit = "per unit",
}: ServiceCardProps) {
  return (
    <Card className={`relative mx-auto w-full max-w-sm pt-0 ${className}`}>
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src={imageSrc}
        alt={imageAlt}
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardAction className={"absolute inset-0 z-40 p-4 flex items-start justify-end"}>
          {showBadge && <Badge variant={badgeVariant} className="h-8 rounded-lg">{badgeText}</Badge>}
      </CardAction>
      <CardHeader>
        <CardTitle className="font-bold text-xl">{title}</CardTitle>
        <CardDescription>
          {description}

          <div className="h-2" />
          <div className="mt-2 flex flex-col items-start gap-1 text-chart-6">
              <span className="text-lg font-semibold flex flex-row items-baseline text-chart-6 gap-2">
                  <p className="text-muted-foreground text-sm">Regular</p>
                  P{regularPrice.toFixed(2)}/{unit}
              </span>
              <span className="text-lg font-semibold flex flex-row items-baseline text-chart-6 gap-2">
                  <p className="text-muted-foreground text-sm ">UP Rate</p>
                  P{discountedPrice.toFixed(2)}/{unit}
              </span>
          </div>
        </CardDescription>
      </CardHeader>

      <div className="flex-1/2" />
      <CardFooter>
        <Button className="w-full" onClick={onButtonClick}>{buttonText}</Button>
      </CardFooter>
    </Card>
  )
}
