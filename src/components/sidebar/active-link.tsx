"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function ActiveLink({
  href,
  tooltip,
  style,
  children,
}: {
  href: string;
  tooltip: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = href !== "#" && pathname.startsWith(href);

  return (
    <SidebarMenuButton
      asChild
      tooltip={{ children: tooltip, hidden: false }}
      isActive={isActive}
      className="px-2.5 md:px-2"
    >
      <Link href={href} style={style}>
        {children}
      </Link>
    </SidebarMenuButton>
  );
}
