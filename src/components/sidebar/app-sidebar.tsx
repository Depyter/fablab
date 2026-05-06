import type { ComponentProps } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <Sidebar
      collapsible="icon"
      className="border-r"
      style={{
        background: "var(--fab-bg-sidebar)",
        borderRight: "1px solid var(--fab-border-md)",
      }}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <Link href="/dashboard/chat" aria-label="IskoLab home">
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg shrink-0"
                  style={{ background: "var(--fab-magenta)" }}
                >
                  <Image
                    src="/fablab-dark.svg"
                    alt="FabLab logo"
                    width={16}
                    height={16}
                    className="brightness-0 invert"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span
                    className="truncate font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    IskoLab
                  </span>
                  <span className="truncate text-xs opacity-60">
                    Fablab UP Cebu
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
