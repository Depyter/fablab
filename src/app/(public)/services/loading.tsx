import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-10">
        {/* Hero Header Skeleton */}
        <header className="bg-fab-teal py-28 text-center text-white lg:py-52">
          <div className="mx-auto h-20 w-3/4 animate-pulse bg-white/20 sm:h-32 lg:h-40" />
        </header>

        {/* Digital Fabrication Section Skeleton */}
        <section className="border-t-8 border-black bg-background">
          <div className="bg-fab-magenta p-8 border-b-8 border-black sm:p-14 lg:p-20">
            <Skeleton className="h-12 w-64 bg-white/20" />
          </div>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_3px,transparent_3px),linear-gradient(to_bottom,var(--border)_3px,transparent_3px)] bg-[size:120px_120px] opacity-35" />
            <div className="relative z-10 mx-auto grid max-w-6xl gap-5 p-5 sm:p-8 md:grid-cols-2 lg:gap-7 lg:p-10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 border-4 border-black bg-white/50 p-6">
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
