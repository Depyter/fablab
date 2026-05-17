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
import { ChevronsUpDownIcon, BadgeCheckIcon, LogOutIcon } from "lucide-react";
import { UserProfileDialog } from "@/components/profile/profile-card";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";

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

  const handleSignOut = async () => {
    posthog.reset();
    await authClient.signOut();
    window.location.replace("/login");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-none border-2 border-black bg-fab-teal text-xs font-black text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-black uppercase tracking-tighter">
                  {user.name}
                </span>
                <span className="truncate text-xs text-black/60">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-black/40" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 border-2 border-black bg-white shadow-[4px_4px_0_0_#000]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User identity header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <UserProfileDialog>
                <button className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-black/5 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-none border-2 border-black bg-fab-teal text-xs font-black text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-black uppercase tracking-tighter">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-black/60">
                      {user.email}
                    </span>
                  </div>
                </button>
              </UserProfileDialog>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-black" />

            <DropdownMenuGroup>
              <UserProfileDialog>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer focus:bg-black/5 focus:text-black"
                  onSelect={(e) => e.preventDefault()}
                >
                  <BadgeCheckIcon className="size-4 text-fab-teal" />
                  Account
                </DropdownMenuItem>
              </UserProfileDialog>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black" />

            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:bg-black/5 focus:text-destructive"
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
