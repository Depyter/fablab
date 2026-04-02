"use client";

import * as React from "react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface RoomWithLastMessage {
  _id?: string;
  _creationTime?: number;
  lastMessageId?: string;
  name?: string;
  members?: string;
  color?: string;
  lastMessage: {
    content: string;
    sender: string;
    _id: string;
    _creationTime: number;
  } | null;
}

export function ChatSidebar({
  preloadedRooms,
  className,
}: {
  preloadedRooms: Preloaded<typeof api.chat.query.getRooms>;
  className?: string;
}) {
  const rooms = usePreloadedQuery(preloadedRooms) as
    | (RoomWithLastMessage | null)[]
    | undefined;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [unreadsOnly, setUnreadsOnly] = React.useState(false);
  const params = useParams();
  const activeRoomId = params?.slug as string;

  const filteredRooms = !rooms
    ? []
    : (rooms.filter(
        (room) =>
          room && room.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      ) as RoomWithLastMessage[]);

  const formatTimestamp = (creationTime: number) => {
    const date = new Date(creationTime);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );
      return diffInMinutes > 0 ? `${diffInMinutes}m` : "now";
    }

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-sidebar-border/60 px-4 py-4 shrink-0">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-widest text-sidebar-foreground/70">
            Messages
          </span>
          <Label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
              Unreads
            </span>
            <Switch
              className="scale-75 shadow-none data-[state=checked]:bg-primary"
              checked={unreadsOnly}
              onCheckedChange={setUnreadsOnly}
            />
          </Label>
        </div>
        <Input
          placeholder="Search…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 bg-muted/40 border-border/30 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-sidebar-foreground/30 text-sm"
        />
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms && filteredRooms.length > 0 ? (
          filteredRooms.map((room: RoomWithLastMessage) => {
            const isActive = activeRoomId === room._id;
            return (
              <Link
                href={`/dashboard/chat/${room._id}`}
                key={room._id}
                className={cn(
                  "relative flex flex-col gap-1 px-4 py-3 transition-colors duration-150 border-b border-sidebar-border/30",
                  isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-border/20",
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.75 bg-primary rounded-r-full" />
                )}

                {/* Room name + timestamp */}
                <div className="flex w-full items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: room.color || "var(--primary)" }}
                  />
                  <span
                    className={cn(
                      "text-sm font-semibold truncate flex-1 leading-tight",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground",
                    )}
                  >
                    {room.name}
                  </span>
                  {room.lastMessage && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/30 shrink-0 tabular-nums">
                      {formatTimestamp(room.lastMessage._creationTime)}
                    </span>
                  )}
                </div>

                {/* Preview line */}
                {room.lastMessage ? (
                  <p
                    className={cn(
                      "text-xs line-clamp-1 pl-4 leading-snug",
                      isActive
                        ? "text-sidebar-accent-foreground/60"
                        : "text-sidebar-foreground/45",
                    )}
                  >
                    <span className="font-semibold">
                      {room.lastMessage.sender}:{" "}
                    </span>
                    {room.lastMessage.content || "Sent an attachment"}
                  </p>
                ) : (
                  <span className="text-xs pl-4 text-sidebar-foreground/30 italic">
                    No messages yet
                  </span>
                )}
              </Link>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
              {rooms === undefined ? "Loading…" : "No conversations found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
