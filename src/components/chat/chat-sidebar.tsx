"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";

import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

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
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const rooms = useQuery(api.chat.query.getRooms) as
    | (RoomWithLastMessage | null)[]
    | undefined;
  const [searchTerm, setSearchTerm] = React.useState("");

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
    <Sidebar
      collapsible="none"
      className="border-r h-full overflow-auto"
      {...props}
    >
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Messages</div>
          <Label className="flex items-center gap-2 text-sm">
            <span>Unreads</span>
            <Switch className="shadow-none" />
          </Label>
        </div>
        <SidebarInput
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {filteredRooms && filteredRooms.length > 0 ? (
              filteredRooms.map((room: RoomWithLastMessage) => (
                <Link
                  href={`/dashboard/chat/${room._id}`}
                  key={room._id}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight last:border-b-0 transition-colors"
                >
                  <div className="flex w-full items-center gap-2">
                    {room.color && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: room.color }}
                      />
                    )}
                    <span className="font-medium truncate">{room.name}</span>
                    {room.lastMessage && (
                      <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(room.lastMessage._creationTime)}
                      </span>
                    )}
                  </div>
                  {room.lastMessage ? (
                    <div className="w-full">
                      <span className="text-xs text-muted-foreground">
                        {room.lastMessage.sender}
                      </span>
                      <p className="text-xs text-muted-foreground line-clamp-1 whitespace-break-spaces">
                        {truncateMessage(room.lastMessage.content)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No messages yet
                    </span>
                  )}
                </Link>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {rooms === undefined ? "Loading rooms..." : "No rooms found"}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
