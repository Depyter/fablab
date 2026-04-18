"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  MessageSquareIcon,
  FolderIcon,
  WrenchIcon,
  PackageIcon,
  BarChart2Icon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/sidebar/nav-user";
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
  // ── Available to all ────────────────────────────────────────────────────
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
  // ── Admin / Maker ────────────────────────────────────────────────────────
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
  // ── Reports ──────────────────────────────────────────────────────────────
  {
    title: "Reports",
    url: "#",
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
  const ORDER = ["main", "manage", "reports"] as const;
  const map: Record<string, NavItem[]> = {};
  for (const item of items) {
    (map[item.group] ??= []).push(item);
  }
  return ORDER.filter((k) => map[k]?.length > 0).map((k) => ({
    key: k,
    items: map[k],
  }));
}

export function AppSidebar({
  preloadedProfile,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  preloadedProfile: Preloaded<typeof api.users.getUserProfile>;
}) {
  const profile = usePreloadedQuery(preloadedProfile);
  const pathname = usePathname();

  const role: Role = profile?.role ?? "client";
  const navItems = filterNavItems(allNavItems, role);
  const groups = groupNavItems(navItems);

  const user = {
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    avatar: profile?.profilePicUrl ?? "",
  };

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
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <Link href="/dashboard" aria-label="IskoLab home">
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

      {/* Nav groups */}
      <SidebarContent>
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.key}>
            {groupIndex > 0 && (
              <div className="px-3 py-1">
                <Separator style={{ background: "var(--fab-border-md)" }} />
              </div>
            )}
            <SidebarGroup className="py-0">
              <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      item.url !== "#" && pathname.startsWith(item.url);

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          tooltip={{ children: item.title, hidden: false }}
                          isActive={isActive}
                          className="px-2.5 md:px-2"
                        >
                          <Link
                            href={item.url}
                            style={
                              {
                                "--sidebar-icon-bg": item.iconBackground,
                                "--sidebar-icon-color": item.iconColor,
                              } as React.CSSProperties
                            }
                          >
                            {item.icon}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      {/* User */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
