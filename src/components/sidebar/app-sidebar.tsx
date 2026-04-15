"use client";

import * as React from "react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { FablabHeader } from "@/components/sidebar/fablab-display";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  SettingsIcon,
  MessageSquareIcon,
  FileTextIcon,
  FolderIcon,
} from "lucide-react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";

type Role = "admin" | "maker" | "client";

type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  roles: Role[];
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    roles: Role[];
  }[];
};

const allNavItems: NavItem[] = [
  {
    title: "Messages",
    url: "/dashboard/chat",
    icon: <MessageSquareIcon />,
    roles: ["admin", "maker", "client"],
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: <FolderIcon />,
    roles: ["client"],
  },
  {
    title: "Manage",
    url: "#",
    icon: <SettingsIcon />,
    roles: ["admin", "maker"],
    items: [
      {
        title: "Projects",
        url: "/dashboard/projects",
        roles: ["admin", "maker"],
      },
      {
        title: "Services",
        url: "/dashboard/services",
        roles: ["admin", "maker"],
      },
      {
        title: "Inventory",
        url: "/dashboard/inventory",
        roles: ["admin", "maker"],
      },
    ],
  },
  {
    title: "Reports",
    url: "#",
    icon: <FileTextIcon />,
    roles: ["admin", "maker"],
    items: [
      {
        title: "Overview",
        url: "#",
        roles: ["admin", "maker"],
      },
      {
        title: "Analytics",
        url: "#",
        roles: ["admin", "maker"],
      },
      {
        title: "Usage",
        url: "#",
        roles: ["admin", "maker"],
      },
      {
        title: "Export",
        url: "#",
        roles: ["admin", "maker"],
      },
    ],
  },
];

function filterNavItems(items: NavItem[], role: Role): NavItem[] {
  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      items: item.items?.filter((sub) => sub.roles.includes(role)),
    }));
}

export function AppSidebar({
  preloadedProfile,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  preloadedProfile: Preloaded<typeof api.users.getUserProfile>;
}) {
  const profile = usePreloadedQuery(preloadedProfile);

  const role: Role = profile?.role ?? "client";
  const navItems = filterNavItems(allNavItems, role);

  const user = {
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    avatar: profile?.profilePicUrl ?? "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <FablabHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
