import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ProfileProvider } from "@/components/sidebar/profile-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_private/dashboard")({
  component: RouteComponent,
  loader: async (opts) => {
    opts.context.queryClient.prefetchQuery(
      convexQuery(api.users.getUserProfile, {}),
    );
  },
});

function RouteComponent() {
  const { data, isPending } = useQuery(convexQuery(api.users.getUserProfile, {}));

  return (
    <TooltipProvider>
      <SidebarProvider className="flex h-dvh min-h-0">
        <ProfileProvider profile={data} isPending={isPending}>
          <AppSidebar />
          <SidebarInset className="flex flex-col h-full overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
              <Outlet />
            </div>
          </SidebarInset>
        </ProfileProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
