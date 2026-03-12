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

  const filteredRooms = React.useMemo(() => {
    if (!rooms) return [];
    return rooms.filter(
      (room) =>
        room && room.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) as RoomWithLastMessage[];
  }, [rooms, searchTerm]);

  const formatTimestamp = (creationTime: number) => {
    const date = new Date(creationTime);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );
      return diffInMinutes > 0 ? `${diffInMinutes}m ago` : "now";
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

  const truncateMessage = (message: string, length: number = 40) => {
    return message.length > length ? message.slice(0, length) + "..." : message;
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-sidebar-border p-4 shrink-0">
        <div className="flex w-full items-center justify-between">
          <div className="text-sidebar-foreground font-bold text-lg tracking-tight">
            Messages
          </div>
          <Label className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/70">
            <span>Unreads</span>
            <Switch
              className="scale-75 shadow-none data-[state=checked]:bg-primary"
              checked={unreadsOnly}
              onCheckedChange={setUnreadsOnly}
            />
          </Label>
        </div>
        <div className="relative">
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 bg-background/50 border-sidebar-border focus-visible:ring-primary/20 placeholder:text-sidebar-foreground/40 text-sm"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredRooms && filteredRooms.length > 0 ? (
          filteredRooms.map((room: RoomWithLastMessage) => {
            const isActive = activeRoomId === room._id;
            return (
              <Link
                href={`/dashboard/chat/${room._id}`}
                key={room._id}
                className={cn(
                  "flex flex-col items-start gap-1 p-4 text-sm leading-tight transition-all duration-200 relative group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}

                <div className="flex w-full items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-black/5"
                    style={{ backgroundColor: room.color || "var(--primary)" }}
                  />
                  <span
                    className={cn(
                      "font-semibold truncate flex-1",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground",
                    )}
                  >
                    {room.name}
                  </span>
                  {room.lastMessage && (
                    <span className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
                      {formatTimestamp(room.lastMessage._creationTime)}
                    </span>
                  )}
                </div>

                {room.lastMessage ? (
                  <div className="w-full pl-4 mt-0.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-primary/80 truncate">
                        {room.lastMessage.sender}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-xs line-clamp-1 break-all",
                        isActive
                          ? "text-sidebar-accent-foreground/80"
                          : "text-sidebar-foreground/60",
                      )}
                    >
                      {truncateMessage(room.lastMessage.content)}
                    </p>
                  </div>
                ) : (
                  <span className="text-[11px] pl-4 text-sidebar-foreground/40 italic">
                    No messages yet
                  </span>
                )}
              </Link>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <p className="text-sm font-medium text-sidebar-foreground/50">
              {rooms === undefined
                ? "Loading rooms..."
                : "No conversations found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
