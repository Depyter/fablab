"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ChevronsUpDownIcon,
  BadgeCheckIcon,
  BellIcon,
  LogOutIcon,
} from "lucide-react";
import { UserProfileDialog } from "@/components/profile/profile-card";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const initials = getInitials(user.name);
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace("/login");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-primary font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-sidebar-foreground/50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-sidebar text-sidebar-foreground border-sidebar-border shadow-md"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User identity header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <UserProfileDialog>
                <button className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-sidebar-accent transition-colors rounded-t-lg">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-primary font-semibold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {user.email}
                    </span>
                  </div>
                </button>
              </UserProfileDialog>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-sidebar-border" />

            <DropdownMenuGroup>
              <UserProfileDialog>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer focus:bg-sidebar-accent focus:text-sidebar-foreground"
                  onSelect={(e) => e.preventDefault()}
                >
                  <BadgeCheckIcon className="size-4 text-sidebar-primary" />
                  Account
                </DropdownMenuItem>
              </UserProfileDialog>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-sidebar-border" />

            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:bg-sidebar-accent focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOutIcon className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
