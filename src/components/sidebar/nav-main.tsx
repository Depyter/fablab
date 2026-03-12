"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isChildActive = item.items?.some((sub) =>
            pathname.startsWith(sub.url),
          );

          const isParentUrlActive =
            item.url !== "#" &&
            (pathname === item.url ||
              (item.url === "/dashboard/chat" &&
                pathname.startsWith("/dashboard/chat/")));

          const isParentActive =
            item.isActive || isParentUrlActive || isChildActive;

          if (item.items && item.items.length > 0) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isParentActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "font-sans transition-colors",
                        isParentActive
                          ? "text-primary hover:text-primary"
                          : "text-sidebar-foreground/70 hover:text-primary",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-7 items-center justify-center shrink-0 transition-colors",
                          isParentActive
                            ? "text-primary"
                            : "text-sidebar-foreground/40 group-hover/collapsible:text-primary",
                        )}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={cn(
                          "font-medium tracking-tight",
                          isParentActive ? "font-semibold" : "font-medium",
                        )}
                      >
                        {item.title}
                      </span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isSubActive =
                          pathname === subItem.url ||
                          (subItem.url !== "#" &&
                            pathname.startsWith(subItem.url));

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                "font-sans transition-colors",
                                isSubActive
                                  ? "text-primary hover:text-primary"
                                  : "text-sidebar-foreground/60 hover:text-primary",
                              )}
                            >
                              <a
                                href={subItem.url}
                                className="flex items-center gap-2"
                              >
                                {isSubActive && (
                                  <div className="size-1 rounded-full bg-primary shrink-0" />
                                )}
                                <span
                                  className={cn(
                                    "text-sm tracking-tight",
                                    isSubActive
                                      ? "font-semibold"
                                      : "font-normal",
                                  )}
                                >
                                  {subItem.title}
                                </span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          const isActive =
            pathname === item.url ||
            (item.url === "/dashboard/chat" &&
              pathname.startsWith("/dashboard/chat/"));

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={cn(
                  "font-sans transition-colors",
                  isActive
                    ? "text-primary hover:text-primary"
                    : "text-sidebar-foreground/70 hover:text-primary",
                )}
              >
                <a href={item.url}>
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground/40 group-hover:text-primary",
                    )}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={cn(
                      "font-medium tracking-tight",
                      isActive ? "font-semibold" : "font-medium",
                    )}
                  >
                    {item.title}
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
