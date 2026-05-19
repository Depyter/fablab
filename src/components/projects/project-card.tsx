import { cn } from "@/lib/utils";
import { ProjectStatusType } from "@convex/constants";
import { ManageCard } from "@/components/manage/manage-card";
import { STATUS_STYLES } from "@/lib/project-status-styles";
import { getStatusLabel } from "@/lib/project-type-meta";

export { STATUS_STYLES } from "@/lib/project-status-styles";

interface ProjectCardProps {
  title: string;
  description: string;
  clientName: string;
  serviceName: string;
  usageCount: number;
  type: "WORKSHOP" | "FABRICATION";
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
  usageCount,
  type,
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
      subtitle={`${serviceName} · ${clientName} · ${usageCount} ${
        usageCount === 1 ? "usage" : "usages"
      }`}
      description={description}
      coverUrl={coverUrl}
      coverFallback={
        <div className={cn("h-full w-full bg-linear-to-br", styles.cover)} />
      }
      badgeText={getStatusLabel(status as ProjectStatusType, type)}
      badgeClassName={styles.badge}
      footer={
        <>
          <div className="flex flex-col items-center justify-between w-full">
            <div className="flex flex-row items-center justify-between w-full mb-1">
              <span className="text-xs font-bold text-black/60">
                {bookingDateStr}
                {bookingTimeStr && (
                  <span className="ml-1">· {bookingTimeStr}</span>
                )}
              </span>
              <span className="font-black text-black">
                ₱{estimatedPrice.toFixed(2)}
              </span>
            </div>

            <div className="w-full mt-1">
              <button
                type="button"
                onClick={onOpenDetails}
                className="inline-flex h-8 w-full items-center justify-center border-2 border-black bg-fab-teal px-3 text-[10px] font-black uppercase tracking-wider text-white cursor-pointer rounded-none shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
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
