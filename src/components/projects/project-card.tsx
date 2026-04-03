import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
    <Card
      className={cn(
        "w-full overflow-hidden flex flex-col gap-0 p-0 shadow-none border",
        className,
      )}
    >
      {/* Cover */}
      <div className="relative h-36 w-full shrink-0 overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={cn("h-full w-full bg-linear-to-br", styles.cover)} />
        )}

        {/* Status badge overlaid on cover */}
        <span
          className={cn(
            "absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border backdrop-blur-sm bg-background/70",
            styles.badge,
          )}
        >
          {status}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4 flex-1">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="font-bold text-sm leading-tight truncate">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {serviceName} · {clientName}
          </p>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-between text-xs mt-auto">
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
        </div>

        <Link href="/dashboard/projects/" className="w-full mt-1">
          <Button size="sm" variant="outline" className="w-full h-8 text-xs">
            {buttonText}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
