import { cn } from "@/lib/utils";
import { Id } from "@convex/_generated/dataModel";
import { PROJECT_STATUS_LABELS } from "@convex/constants";
import { ProjectDetails } from "./project-details";
import { ManageCard } from "@/components/manage/manage-card";

export const STATUS_STYLES: Record<string, { badge: string; cover: string }> = {
  pending: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    cover: "from-amber-500/20 to-amber-500/5",
  },
  approved: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    cover: "from-blue-500/20 to-blue-500/5",
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cover: "from-emerald-500/20 to-emerald-500/5",
  },
  paid: {
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    cover: "from-teal-500/20 to-teal-500/5",
  },
  rejected: {
    badge: "bg-red-100 text-red-700 border-red-200",
    cover: "from-red-500/20 to-red-500/5",
  },
  cancelled: {
    badge: "bg-red-100 text-red-700 border-red-200",
    cover: "from-red-500/20 to-red-500/5",
  },
};

interface ProjectCardProps {
  projectId: Id<"projects">;
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
}

export function ProjectCard({
  projectId,
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
      badgeText={PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] ?? status}
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
              <ProjectDetails
                projectId={projectId}
                serviceName={serviceName}
                trigger={
                  <div className="inline-flex h-8 w-full items-center justify-center rounded-full border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 cursor-pointer">
                    View Details
                  </div>
                }
              />
            </div>
          </div>
        </>
      }
    ></ManageCard>
  );
}
