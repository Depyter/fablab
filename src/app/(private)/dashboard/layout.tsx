import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { DashboardHeader } from "@/components/sidebar/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPreloadedUserProfile } from "@/lib/auth-queries";
import { fetchAuthMutation } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

export default async function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await fetchAuthMutation(api.users.ensureUserProfile, {});
  const preloadedProfile = await getPreloadedUserProfile();

  return (
    <TooltipProvider>
      <SidebarProvider className="flex h-screen">
        <AppSidebar preloadedProfile={preloadedProfile} />
        <SidebarInset className="flex flex-col h-full overflow-y-auto">
          <DashboardHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
