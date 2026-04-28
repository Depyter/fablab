import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPreloadedUserProfile, hasValidSession } from "@/lib/auth-queries";
import { redirect } from "next/navigation";

export default async function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const preloadedProfile = await getPreloadedUserProfile();

  return (
    <TooltipProvider>
      <SidebarProvider className="flex h-screen">
        <AppSidebar preloadedProfile={preloadedProfile} />
        <SidebarInset className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
