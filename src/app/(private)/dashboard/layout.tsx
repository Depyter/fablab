import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { DashboardHeader } from "@/components/sidebar/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider className="flex h-screen">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full overflow-y-auto">
          <DashboardHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
