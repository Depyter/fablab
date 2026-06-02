import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  BarChart2Icon,
  CalendarCheckIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  FolderIcon,
  MessageSquareIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import * as React from "react";
import { NavUser } from "@/components/sidebar/nav-user";
import { useProfile } from "@/components/sidebar/profile-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePostHogIdentify } from "@/hooks/use-posthog-identify";

type Role = "admin" | "maker" | "client";

type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  iconBackground: string;
  iconColor: string;
  roles: Array<Role>;
  group: "main" | "manage" | "reports";
};

const allNavItems: Array<NavItem> = [
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

function filterNavItems(items: Array<NavItem>, role: Role): Array<NavItem> {
  return items.filter((item) => item.roles.includes(role));
}

function groupNavItems(
  items: Array<NavItem>,
): Array<{ key: string; items: Array<NavItem> }> {
  const order = ["main", "manage", "reports"] as const;
  const grouped: Record<string, Array<NavItem>> = {};

  for (const item of items) {
    const groupItems = grouped[item.group] ?? [];
    groupItems.push(item);
    grouped[item.group] = groupItems;
  }

  return order
    .filter((group) => grouped[group]?.length)
    .map((group) => ({ key: group, items: grouped[group] }));
}

export function SidebarNavigation() {
  const { profile } = useProfile();
  const role: Role = profile?.role ?? "client";
  const groups = groupNavItems(filterNavItems(allNavItems, role));
  const { isMobile, setOpenMobile } = useSidebar();
  const matchRoute = useMatchRoute();

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
                  const currentRoute = !!matchRoute({
                    to: item.url,
                    pending: true,
                  });

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={{ children: item.title, hidden: false }}
                        isActive={currentRoute}
                        className="px-2.5 md:px-2"
                      >
                        <Link
                          to={item.url}
                          style={
                            {
                              "--sidebar-icon-bg": item.iconBackground,
                              "--sidebar-icon-color": item.iconColor,
                            } as React.CSSProperties
                          }
                          onClick={() => isMobile && setOpenMobile(false)}
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
  );
}

export function SidebarUserFooter() {
  const { profile, isPending } = useProfile();

  usePostHogIdentify(profile ?? null);

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled className="pointer-events-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="rounded-none border-2 border-black bg-fab-teal text-xs font-black text-white">
                ...
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-black uppercase tracking-tighter text-black/50">
                Loading profile
              </span>
              <span className="truncate text-xs text-black/40">
                Please wait
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-black/20" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

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
