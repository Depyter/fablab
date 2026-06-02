import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import type { ComponentProps } from "react";
import {
  SidebarNavigation,
  SidebarUserFooter,
} from "@/components/sidebar/app-sidebar-content";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="md:h-10 md:p-0 border-2 border-black rounded-none bg-background"
            >
              <Link
                to="/"
                aria-label="IskoLab home"
                className="inline-flex items-center gap-3 mr-10"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-none p-1">
                  <Image
                    src="/mini_logo.svg"
                    alt="IskoLab"
                    width={24}
                    height={24}
                    className="h-6 w-auto"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black uppercase tracking-tighter">
                    IskoLab
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarNavigation />

      <SidebarFooter>
        <SidebarUserFooter />
      </SidebarFooter>
    </Sidebar>
  );
}
