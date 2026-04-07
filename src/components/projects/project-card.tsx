import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ManageCard } from "@/components/manage/manage-card";

const STATUS_STYLES: Record<string, { badge: string; cover: string }> = {
  pending: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    cover: "from-amber-500/20 to-amber-500/5",
  },
  approved: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    cover: "from-blue-500/20 to-blue-500/5",
  },
  rejected: {
    badge: "bg-red-100 text-red-700 border-red-200",
    cover: "from-red-500/20 to-red-500/5",
  },
};

interface ProjectCardProps {
  title: string;
  description: string;
  clientName: string;
  serviceName: string;
  bookingDate: number;
  estimatedPrice: number;
  status: string;
  coverUrl?: string | null;
  bookingTime?: number;
  buttonText?: string;
  className?: string;
}

export function ProjectCard({
  title,
  description,
  clientName,
  serviceName,
  bookingDate,
  bookingTime,
  estimatedPrice,
  status,
  coverUrl,
  buttonText = "View Details",
  className,
}: ProjectCardProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <ManageCard
      className={className}
      title={title}
      subtitle={`${serviceName} · ${clientName}`}
      description={description}
      coverUrl={coverUrl}
      coverFallback={
        <div className={cn("h-full w-full bg-linear-to-br", styles.cover)} />
      }
      badgeText={status}
      badgeClassName={styles.badge}
      footer={
        <>
          <span className="text-muted-foreground">
            {new Date(bookingDate).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {bookingTime !== undefined && (
              <span className="ml-1 opacity-70">
                ·{" "}
                {new Date(bookingTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </span>
          <span className="font-semibold text-foreground">
            ₱{estimatedPrice.toFixed(2)}
          </span>
        </>
      }
      action={
        <Link href="/dashboard/projects/" className="w-full block">
          <Button size="sm" variant="outline" className="w-full h-8 text-xs">
            {buttonText}
          </Button>
        </Link>
      }
    />
  );
}
