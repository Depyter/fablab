import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PublicNavbar } from "@/components/public-navbar";

export const Route = createFileRoute("/_public")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-full flex flex-col">
      <PublicNavbar />
      <main className="min-h-0 flex-1 pt-20 sm:pt-0">
        <Outlet />
      </main>
      <footer className="relative z-10 bg-background py-16 text-center sm:py-24 border-black">
        <p className="text-xl font-black uppercase tracking-tighter text-black sm:text-3xl">
          FabLab UP Cebu • Cebu City • © 2026
        </p>
      </footer>
    </div>
  );
}
