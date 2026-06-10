import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ProfileProvider } from "@/components/sidebar/profile-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPreloadedUserProfile } from "@/lib/auth-queries";

export default async function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preloadedProfile = await getPreloadedUserProfile();

  return (
    <TooltipProvider>
      <SidebarProvider className="flex h-dvh min-h-0">
        <ProfileProvider preloadedProfile={preloadedProfile}>
          <AppSidebar />
          <SidebarInset className="flex flex-col h-full overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </ProfileProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
