"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  SidebarNavigation,
  SidebarUserFooter,
} from "@/components/sidebar/app-sidebar-content";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="md:h-10 md:p-0 border-2 border-black rounded-none bg-fab-teal "
            >
              <Link href="/" aria-label="IskoLab home">
                <span className="flex size-8 shrink-0 items-center justify-center text-sm font-black text-white">
                  i
                </span>
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
