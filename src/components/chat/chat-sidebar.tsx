"use client";

import * as React from "react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Hash, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface RoomWithLastMessage {
  _id?: string;
  _creationTime?: number;
  name?: string;
  members?: string;
  color?: string;
  lastMessageText?: string;
  lastMessageAt?: number;
  unreadCount?: number;
  threads?: {
    _id: string;
    title: string;
    lastMessageText?: string;
    unreadCount?: number;
    archived?: "Archived" | "Active";
  }[];
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
  const searchParams = useSearchParams();
  const activeRoomId = params?.slug as string;
  const activeThreadId = searchParams.get("thread");

  const [collapsedRooms, setCollapsedRooms] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedArchived, setExpandedArchived] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRoom = (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  const toggleArchived = (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedArchived((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

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
      <div className="flex flex-col gap-3 px-4 py-4 shrink-0">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-sidebar-foreground/50">
            Messages
          </span>
          <Label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-bold uppercase tracking-widest text-sidebar-foreground/40">
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
          className="h-9 bg-sidebar-accent/30 border-none shadow-none text-sm placeholder:text-sidebar-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms && filteredRooms.length > 0 ? (
          filteredRooms.map((room: RoomWithLastMessage) => {
            const isActive = activeRoomId === room._id;
            return (
              <div key={room._id} className="flex flex-col">
                <Link
                  href={`/dashboard/chat/${room._id}`}
                  className={cn(
                    "relative flex flex-col gap-0.5 px-3 py-2 mx-1 rounded-md transition-colors",
                    isActive && !activeThreadId
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-white/5",
                  )}
                >
                  {/* Active indicator */}
                  {isActive && !activeThreadId && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.75 bg-primary rounded-r-full" />
                  )}

                  {/* Room name + timestamp */}
                  <div className="flex w-full items-center gap-2 min-w-0">
                    <button
                      onClick={(e) => toggleRoom(e, room._id!)}
                      className="p-0.5 hover:bg-white/10 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground -ml-1 shrink-0"
                    >
                      {collapsedRooms[room._id!] ? (
                        <ChevronRight className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    {/*<MessageSquare className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />*/}
                    <span
                      className={cn(
                        "text-base font-medium truncate flex-1 leading-tight",
                        isActive && !activeThreadId
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground",
                      )}
                    >
                      {room.name}
                    </span>
                    {room.unreadCount ? (
                      <div className="h-4 px-1.5 min-w-[1rem] rounded-full bg-white/90 text-black text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {room.unreadCount}
                      </div>
                    ) : room.lastMessageAt ? (
                      <span className="text-[11px] font-medium text-sidebar-foreground/40 shrink-0 tabular-nums">
                        {formatTimestamp(room.lastMessageAt)}
                      </span>
                    ) : null}
                  </div>
                </Link>

                {/* Nested Threads */}
                {room.threads &&
                  room.threads.length > 0 &&
                  !collapsedRooms[room._id!] &&
                  (() => {
                    const activeThreads = room.threads.filter(
                      (t) => t.archived !== "Archived",
                    );
                    const archivedThreads = room.threads.filter(
                      (t) => t.archived === "Archived",
                    );

                    return (
                      <div className="flex flex-col pb-2 relative">
                        {activeThreads.map((thread) => {
                          const isThreadActive = activeThreadId === thread._id;
                          return (
                            <Link
                              href={`/dashboard/chat/${room._id}?thread=${thread._id}`}
                              key={thread._id}
                              className={cn(
                                "relative flex items-center gap-2 pl-7 pr-3 py-1.5 mx-1 rounded-md transition-colors duration-150 group",
                                isThreadActive
                                  ? "bg-primary/15 text-primary"
                                  : "hover:bg-white/5",
                              )}
                            >
                              {/* Active indicator */}
                              {isThreadActive && (
                                <div className="absolute left-0 top-1 bottom-1 w-0.75 bg-primary rounded-r-full" />
                              )}

                              <Hash className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                              <span
                                className={cn(
                                  "text-[15px] font-medium truncate flex-1",
                                  isThreadActive
                                    ? "text-primary"
                                    : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
                                )}
                              >
                                {thread.title}
                              </span>

                              {thread.unreadCount ? (
                                <div className="h-4 px-1.5 min-w-[1rem] rounded-full bg-white/90 text-black text-[10px] font-semibold flex items-center justify-center shrink-0">
                                  {thread.unreadCount}
                                </div>
                              ) : null}
                            </Link>
                          );
                        })}

                        {archivedThreads.length > 0 && (
                          <div className="flex flex-col mt-1">
                            <button
                              onClick={(e) => toggleArchived(e, room._id!)}
                              className="flex items-center gap-2 pl-7 pr-3 py-1.5 mx-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
                            >
                              {!expandedArchived[room._id!] ? (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                              )}
                              <span className="text-[15px] font-medium">
                                Archived
                              </span>
                            </button>
                            {expandedArchived[room._id!] && (
                              <div className="flex flex-col mt-0.5">
                                {archivedThreads.map((thread) => {
                                  const isThreadActive =
                                    activeThreadId === thread._id;
                                  return (
                                    <Link
                                      href={`/dashboard/chat/${room._id}?thread=${thread._id}`}
                                      key={thread._id}
                                      className={cn(
                                        "relative flex items-center gap-2 pl-11 pr-3 py-1.5 mx-1 rounded-md transition-colors duration-150 group",
                                        isThreadActive
                                          ? "bg-primary/15 text-primary"
                                          : "hover:bg-white/5",
                                      )}
                                    >
                                      {/* Active indicator */}
                                      {isThreadActive && (
                                        <div className="absolute left-0 top-1 bottom-1 w-0.75 bg-primary rounded-r-full" />
                                      )}

                                      <Hash className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                                      <span
                                        className={cn(
                                          "text-[14px] font-medium truncate flex-1 opacity-70",
                                          isThreadActive
                                            ? "text-primary opacity-100"
                                            : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
                                        )}
                                      >
                                        {thread.title}
                                      </span>

                                      {thread.unreadCount ? (
                                        <div className="h-4 px-1.5 min-w-[1rem] rounded-full bg-white/90 text-black text-[10px] font-semibold flex items-center justify-center shrink-0">
                                          {thread.unreadCount}
                                        </div>
                                      ) : null}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
              {rooms === undefined ? "Loading…" : "No conversations found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
