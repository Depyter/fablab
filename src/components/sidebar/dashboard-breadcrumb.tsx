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
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>{room?.name ?? "..."}</BreadcrumbPage>
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
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
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
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          {slug ? (
            <BreadcrumbLink href={`/dashboard/${section}`}>
              {sectionLabel}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
          )}
        </BreadcrumbItem>

        {/* Chat room detail */}
        {section === "chat" && slug && <ChatRoomBreadcrumb roomId={slug} />}

        {/* Generic sub-page fallback */}
        {section !== "chat" && slug && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="capitalize">{slug}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
