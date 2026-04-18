"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import usePresence from "@convex-dev/presence/react";

import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  if (!window.crypto) {
    Object.defineProperty(window, "crypto", { value: {}, writable: true });
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface PresenceIndicatorProps {
  threadId: string;
  userId: string;
  roomId: Id<"rooms">;
}

export function PresenceIndicator({
  threadId,
  userId,
  roomId,
}: PresenceIndicatorProps) {
  const presenceState = usePresence(api.presence, threadId, userId);
  const members = useQuery(api.chat.query.getRoomMembers, { roomId });

  if (!presenceState || !members) return null;

  const online = presenceState.filter((p) => p.online);
  if (online.length === 0) return null;

  // Build a name → profilePicUrl map from room members
  const picByName = new Map<string, string | null>();
  for (const member of members) {
    picByName.set(
      member.name,
      (member as { profilePicUrl?: string | null }).profilePicUrl ?? null,
    );
  }

  const visible = online.slice(0, 3);
  const overflow = online.length - 3;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Stacked avatars */}
      <div className="flex items-center">
        {visible.map((presence, i) => {
          const picUrl = picByName.get(presence.userId) ?? null;
          return (
            <div
              key={presence.userId}
              title={presence.userId}
              className={cn(
                "h-7 w-7 rounded-full border-2 border-background bg-sidebar flex items-center justify-center overflow-hidden shrink-0 shadow-sm",
                i > 0 && "-ml-2.5",
              )}
            >
              {picUrl ? (
                <img
                  src={picUrl}
                  alt={presence.userId}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className="text-[9px] font-black leading-none select-none"
                  style={{
                    color: "var(--fab-text-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {getInitials(presence.userId)}
                </span>
              )}
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="h-7 w-7 rounded-full border-2 border-background bg-sidebar flex items-center justify-center -ml-2.5 shrink-0 shadow-sm">
            <span
              className="text-[9px] font-black leading-none"
              style={{
                color: "var(--fab-text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              +{overflow}
            </span>
          </div>
        )}
      </div>

      {/* Online label — subtle and on-brand */}
      <div className="hidden sm:flex items-center gap-1.5 ml-1">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: "var(--fab-teal)" }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: "var(--fab-teal)" }}
          />
        </span>
        <span
          className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40"
          style={{
            color: "var(--fab-text-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          {online.length}
        </span>
      </div>
    </div>
  );
}

/**
 * Self-contained widget for the desktop DashboardHeader.
 * Reads the active thread + room from the URL and the current user from the profile query.
 */
export function ChatPresenceWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profile = useQuery(api.users.getUserProfile);

  const chatMatch = pathname.match(/^\/dashboard\/chat\/([^/]+)/);
  const roomId = chatMatch?.[1] as Id<"rooms"> | undefined;
  const threadId = searchParams.get("thread");

  if (!roomId || !threadId || !profile?.name) return null;

  return (
    <PresenceIndicator
      threadId={threadId}
      userId={profile.name}
      roomId={roomId}
    />
  );
}
