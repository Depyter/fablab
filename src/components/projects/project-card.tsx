import { cn } from "@/lib/utils";
import { Id } from "@convex/_generated/dataModel";
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
  rejected: {
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
  bookingDate: number;
  estimatedPrice: number;
  status: string;
  coverUrl?: string | null;
  bookingTime?: number;
  className?: string;
}

export function ProjectCard({
  projectId,
  title,
  description,
  clientName,
  serviceName,
  bookingDate,
  bookingTime,
  estimatedPrice,
  status,
  coverUrl,
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
          <div className="flex flex-col items-center justify-between w-full">
            <div className="flex flex-row items-center justify-between w-full mb-1">
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

            <div className="w-full mt-1">
              <ProjectDetails
                projectId={projectId}
                bookingDate={bookingDate}
                bookingTime={bookingTime}
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
