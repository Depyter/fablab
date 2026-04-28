import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const dashboardOverviewSkeletonKeys = Array.from(
  { length: 24 },
  (_, slot) => `dashboard-overview-skeleton-${slot}`,
);
const dashboardActivitySkeletonKeys = Array.from(
  { length: 24 },
  (_, slot) => `dashboard-activity-skeleton-${slot}`,
);

export default function Page() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-md border-b border-sidebar-border/50 sticky top-0 z-30 px-4">
        <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-primary transition-colors shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 bg-sidebar-border/60 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight truncate">
            Dashboard
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 ">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3 mt-4">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-screen flex-1 rounded-xl md:min-h-min" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {dashboardOverviewSkeletonKeys.map((key) => (
            <div
              key={key}
              className="bg-muted/50 aspect-video h-12 w-full rounded-lg"
            />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {dashboardActivitySkeletonKeys.map((key) => (
            <div
              key={key}
              className="bg-muted/50 aspect-video h-12 w-full rounded-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
