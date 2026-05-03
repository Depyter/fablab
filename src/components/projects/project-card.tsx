import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABELS } from "@convex/constants";
import { ManageCard } from "@/components/manage/manage-card";
import { STATUS_STYLES } from "@/lib/project-status-styles";

export { STATUS_STYLES } from "@/lib/project-status-styles";

interface ProjectCardProps {
  title: string;
  description: string;
  clientName: string;
  serviceName: string;
  bookingDate: number | null;
  bookingStartTime: number | null;
  bookingEndTime: number | null;
  estimatedPrice: number;
  status: string;
  coverUrl?: string | null;
  className?: string;
  onOpenDetails: () => void;
}

export function ProjectCard({
  title,
  description,
  clientName,
  serviceName,
  bookingDate,
  bookingStartTime,
  bookingEndTime,
  estimatedPrice,
  status,
  coverUrl,
  className,
  onOpenDetails,
}: ProjectCardProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  const bookingDateStr = bookingDate
    ? new Date(bookingDate).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const bookingTimeStr =
    bookingStartTime && bookingEndTime
      ? `${new Date(bookingStartTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} – ${new Date(bookingEndTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null;

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
      badgeText={
        PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] ??
        status
      }
      badgeClassName={styles.badge}
      footer={
        <>
          <div className="flex flex-col items-center justify-between w-full">
            <div className="flex flex-row items-center justify-between w-full mb-1">
              <span className="text-muted-foreground text-xs">
                {bookingDateStr}
                {bookingTimeStr && (
                  <span className="ml-1 opacity-70">· {bookingTimeStr}</span>
                )}
              </span>
              <span className="font-semibold text-foreground">
                ₱{estimatedPrice.toFixed(2)}
              </span>
            </div>

            <div className="w-full mt-1">
              <button
                type="button"
                onClick={onOpenDetails}
                className="inline-flex h-8 w-full items-center justify-center rounded-full border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 cursor-pointer"
              >
                View Details
              </button>
            </div>
          </div>
        </>
      }
    ></ManageCard>
  );
}
