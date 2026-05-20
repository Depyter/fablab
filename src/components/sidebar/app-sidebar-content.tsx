"use client";

import * as React from "react";
import { usePostHogIdentify } from "@/hooks/use-posthog-identify";
import {
  CalendarCheckIcon,
  CalendarIcon,
  MessageSquareIcon,
  FolderIcon,
  WrenchIcon,
  PackageIcon,
  BarChart2Icon,
  UsersIcon,
} from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ActiveLink } from "@/components/sidebar/active-link";
import { NavUser } from "@/components/sidebar/nav-user";
import { useProfile } from "@/components/sidebar/profile-context";
import { Separator } from "@/components/ui/separator";

type Role = "admin" | "maker" | "client";

type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  iconBackground: string;
  iconColor: string;
  roles: Role[];
  group: "main" | "manage" | "reports";
};

const allNavItems: NavItem[] = [
  {
    title: "Messages",
    url: "/dashboard/chat",
    icon: <MessageSquareIcon />,
    iconBackground: "var(--fab-magenta-light)",
    iconColor: "var(--fab-magenta)",
    roles: ["admin", "maker", "client"],
    group: "main",
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: <FolderIcon />,
    iconBackground: "var(--fab-bg-main)",
    iconColor: "var(--chart-4)",
    roles: ["admin", "maker", "client"],
    group: "main",
  },
  {
    title: "Calendar",
    url: "/dashboard/calendar",
    icon: <CalendarIcon />,
    iconBackground: "var(--fab-teal-light)",
    iconColor: "var(--fab-teal)",
    roles: ["admin", "maker", "client"],
    group: "main",
  },
  {
    title: "Workshops",
    url: "/dashboard/workshops",
    icon: <CalendarCheckIcon />,
    iconBackground: "var(--fab-amber-light)",
    iconColor: "var(--fab-amber)",
    roles: ["admin", "maker", "client"],
    group: "main",
  },
  {
    title: "Services",
    url: "/dashboard/services",
    icon: <WrenchIcon />,
    iconBackground: "var(--fab-timeline-complete-soft)",
    iconColor: "var(--fab-teal)",
    roles: ["admin", "maker"],
    group: "manage",
  },
  {
    title: "Inventory",
    url: "/dashboard/inventory",
    icon: <PackageIcon />,
    iconBackground: "var(--fab-amber-light)",
    iconColor: "var(--fab-amber)",
    roles: ["admin", "maker"],
    group: "manage",
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: <UsersIcon />,
    iconBackground: "var(--fab-bg-main)",
    iconColor: "var(--fab-magenta)",
    roles: ["admin"],
    group: "manage",
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: <BarChart2Icon />,
    iconBackground: "var(--fab-bg-deep)",
    iconColor: "var(--fab-text-muted)",
    roles: ["admin", "maker"],
    group: "reports",
  },
];

function filterNavItems(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}

function groupNavItems(items: NavItem[]): { key: string; items: NavItem[] }[] {
  const order = ["main", "manage", "reports"] as const;
  const grouped: Record<string, NavItem[]> = {};

  for (const item of items) {
    (grouped[item.group] ??= []).push(item);
  }

  return order
    .filter((group) => grouped[group]?.length)
    .map((group) => ({ key: group, items: grouped[group] }));
}

export function SidebarNavigation() {
  const profile = useProfile();
  const role: Role = profile?.role ?? "client";
  const groups = groupNavItems(filterNavItems(allNavItems, role));

  return (
    <SidebarContent>
      {groups.map((group, groupIndex) => (
        <React.Fragment key={group.key}>
          {groupIndex > 0 && (
            <div className="px-3 py-1">
              <Separator className="bg-black" />
            </div>
          )}
          <SidebarGroup className="py-0">
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {group.items.map((item) => {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <ActiveLink
                        href={item.url}
                        tooltip={item.title}
                        style={
                          {
                            "--sidebar-icon-bg": item.iconBackground,
                            "--sidebar-icon-color": item.iconColor,
                          } as React.CSSProperties
                        }
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </ActiveLink>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </React.Fragment>
      ))}
    </SidebarContent>
  );
}

export function SidebarUserFooter() {
  const profile = useProfile();

  usePostHogIdentify(profile ?? null);

  return (
    <NavUser
      user={{
        name: profile?.name ?? "",
        email: profile?.email ?? "",
        avatar: profile?.profilePicUrl ?? "",
      }}
    />
  );
}
