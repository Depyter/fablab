import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { stat } from "fs";
// import Image from "next/image";
import Link from "next/link";

interface ProjectCardProps {
  // required
  //   slug: string;
  //   imageSrc: string;
  clientName: string;
  serviceName: string;
  title: string;
  description: string;

  bookingDate: number;
  estimatedPrice: number;
  status: string;

  bookingTime?: number;
  buttonText?: string;
  showBadge?: boolean;
  badgeVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
  className?: string;
}

export function ProjectCard({
  //   slug,
  //   imageSrc,
  title,
  description,
  clientName,
  serviceName,
  bookingDate,
  bookingTime,
  estimatedPrice,
  status,
  buttonText = "View Details",
  showBadge = true,
  badgeVariant = status === "completed"
    ? "outline"
    : status === "active"
      ? "secondary"
      : "destructive",

  className = "",
}: ProjectCardProps) {
  return (
    <Card className={`relative mx-auto w-full max-w-sm pt-5 ${className}`}>
      <CardAction
        className={"absolute inset-0 z-40 p-4 flex items-start justify-end"}
      >
        {showBadge && (
          <Badge variant={badgeVariant} className="h-8 rounded-lg h-8">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )}
      </CardAction>
      <CardHeader>
        <CardTitle className="font-bold text-xl">{title}</CardTitle>
        <CardDescription>
          {serviceName} for {clientName}
          <div className="h-2" />
          <div className="mt-2 flex flex-col items-start gap-1 text-chart-6">
            <div className="text-sm">
              <span className="font-medium text-gray-900">Booking Date: </span>
              {new Date(bookingDate).toLocaleDateString()}

              {bookingTime && (
                <span className="ml-2 text-gray-500">
                  at{" "}
                  {new Date(bookingTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">
                Estimated Price:{" "}
              </span>
              ₱ {estimatedPrice.toFixed(2)}
            </div>
          </div>
        </CardDescription>
      </CardHeader>

      <div className="flex-1/2" />
      <CardFooter>
        <Link href={`/dashboard/projects/`} className="w-full">
          <Button className="w-full">{buttonText}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
