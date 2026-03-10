"use client";

import Image from "next/image";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function FablabHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <Image
            width={32}
            height={32}
            alt="fablab logo"
            src={"/fablab-dark.svg"}
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">IskoLab</span>
            <span className="truncate text-xs">Fablab UP Cebu</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
