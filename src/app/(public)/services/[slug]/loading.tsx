import { Skeleton } from "@/components/ui/skeleton";

export default function ServiceDetailLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-[size:120px_120px] opacity-25" />
      
      <header className="relative z-10 border-b-8 border-black bg-background">
        <div className="container mx-auto max-w-7xl px-6 py-6">
          <Skeleton className="h-4 w-32" />
        </div>
      </header>

      <section className="relative z-10 border-b-8 border-black bg-fab-amber/10">
        <div className="container mx-auto grid max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b-8 border-black bg-background lg:border-b-0 lg:border-r-8 aspect-video sm:aspect-square">
            <Skeleton className="h-full w-full" />
          </div>

          <div className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
            <div className="space-y-6">
              <div className="flex gap-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}
