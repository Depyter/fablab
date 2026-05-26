"use client";

import type { ComponentProps } from "react";
import Image from "next/image";
import { Link } from "@tanstack/react-router";
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
              className="md:h-10 md:p-0 border-2 border-black rounded-none bg-background"
            >
              <Link
                href="/"
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
