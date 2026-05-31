import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_private/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <TooltipProvider>
      <SidebarProvider className="flex h-dvh min-h-0">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full overflow-hidden">
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
