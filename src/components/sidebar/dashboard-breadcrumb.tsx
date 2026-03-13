"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  chat: "Messages",
  services: "Services",
  projects: "Projects",
  inventory: "Inventory",
  reports: "Reports",
};

function ChatRoomBreadcrumb({ roomId }: { roomId: string }) {
  const room = useQuery(api.chat.query.getRoom, {
    roomId: roomId as Id<"rooms">,
  });

  return (
    <>
      <BreadcrumbSeparator className="text-sidebar-foreground/20" />
      <BreadcrumbItem>
        <BreadcrumbPage className="font-bold text-foreground truncate max-w-[150px] md:max-w-[300px]">
          {room?.name ?? "..."}
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  // Strip leading /dashboard/ and split into segments
  const segments = pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-bold text-foreground tracking-tight">
              Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const [section, ...rest] = segments;
  const sectionLabel = SECTION_LABELS[section] ?? section;
  const slug = rest[0];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink
            href="/dashboard"
            className="text-xs uppercase tracking-widest font-bold text-sidebar-foreground/40 hover:text-primary transition-colors"
          >
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block text-sidebar-foreground/20" />

        <BreadcrumbItem>
          {slug ? (
            <BreadcrumbLink
              href={`/dashboard/${section}`}
              className="text-xs uppercase tracking-widest font-bold text-sidebar-foreground/40 hover:text-primary transition-colors"
            >
              {sectionLabel}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="font-bold text-foreground tracking-tight">
              {sectionLabel}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>

        {/* Chat room detail */}
        {section === "chat" && slug && <ChatRoomBreadcrumb roomId={slug} />}

        {/* Generic sub-page fallback */}
        {section !== "chat" && slug && (
          <>
            <BreadcrumbSeparator className="text-sidebar-foreground/20" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-bold text-foreground capitalize tracking-tight">
                {slug.replace(/-/g, " ")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
