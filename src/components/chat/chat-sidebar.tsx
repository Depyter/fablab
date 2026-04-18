"use client";

import * as React from "react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Hash, ChevronDown, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Id } from "@convex/_generated/dataModel";

import { RoomSettingsDialog } from "./room-settings-dialog";
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
  const searchParams = useSearchParams();
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

  return (
    <div
      className={cn("flex flex-col h-full", className)}
      style={{
        background: "var(--fab-bg-sidebar)",
        borderRight: "1px solid var(--fab-border-md)",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--fab-border)" }}
      >
        <SidebarTrigger className="text-[var(--fab-text-dim)] hover:text-[var(--fab-text-primary)] transition-colors" />
        <span
          className="text-[10px] font-bold tracking-[0.12em] uppercase flex-1"
          style={{
            color: "var(--fab-text-dim)",
            fontFamily: "var(--font-body)",
          }}
        >
          Messages
        </span>
      </div>

      {/* ── Room list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredRooms && filteredRooms.length > 0 ? (
          filteredRooms.map((room: RoomWithLastMessage) => {
            return (
              <div key={room._id} className="flex flex-col">
                {/* Room header row */}
                <div
                  onClick={(e) => toggleRoom(e, room._id!)}
                  className="relative flex flex-col gap-0.5 px-3 py-2 mx-1 rounded-md transition-colors cursor-pointer group"
                  style={{ fontFamily: "var(--font-body)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(80,60,160,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div className="flex w-full items-center gap-2 min-w-0">
                    <div
                      className="p-0.5 rounded -ml-1 shrink-0 transition-colors"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      {collapsedRooms[room._id!] ? (
                        <ChevronRight className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className="text-[15px] font-semibold truncate flex-1 leading-tight"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {room.name}
                    </span>
                    {room._id && room.name && (
                      <RoomSettingsDialog
                        roomId={room._id as Id<"rooms">}
                        roomName={room.name}
                      />
                    )}
                  </div>
                </div>

                {/* Nested Threads */}
                {room.threads &&
                  room.threads.length > 0 &&
                  !collapsedRooms[room._id!] &&
                  (() => {
                    const activeThreads = room.threads!.filter(
                      (t) => t.archived !== "Archived",
                    );
                    const archivedThreads = room.threads!.filter(
                      (t) => t.archived === "Archived",
                    );

                    return (
                      <div className="flex flex-col pb-2 relative">
                        {/* ── Active threads ── */}
                        {activeThreads.map((thread) => {
                          const isThreadActive = activeThreadId === thread._id;
                          return (
                            <Link
                              href={`/dashboard/chat/${room._id}?thread=${thread._id}`}
                              key={thread._id}
                              className="relative flex items-center gap-2 pl-7 pr-3 py-1.5 mx-1 rounded-md transition-colors duration-150 group"
                              style={
                                isThreadActive
                                  ? {
                                      background: "var(--fab-teal-light)",
                                      borderLeft: "3px solid var(--fab-teal)",
                                      paddingLeft: "calc(1.75rem - 3px)",
                                    }
                                  : undefined
                              }
                              onMouseEnter={(e) => {
                                if (!isThreadActive)
                                  e.currentTarget.style.background =
                                    "rgba(80,60,160,0.06)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isThreadActive)
                                  e.currentTarget.style.background =
                                    "transparent";
                              }}
                            >
                              <Hash
                                className="h-4 w-4 shrink-0"
                                style={{
                                  color: isThreadActive
                                    ? "var(--fab-teal)"
                                    : "var(--fab-text-dim)",
                                }}
                              />
                              <span
                                className="text-[14px] font-medium truncate flex-1"
                                style={{
                                  fontFamily: "var(--font-body)",
                                  color: isThreadActive
                                    ? "var(--fab-teal)"
                                    : "var(--fab-text-muted)",
                                }}
                              >
                                {thread.title}
                              </span>

                              {thread.unreadCount &&
                              thread._id !== activeThreadId ? (
                                <div
                                  className="h-4 px-1.5 min-w-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                                  style={{ background: "var(--fab-magenta)" }}
                                >
                                  {thread.unreadCount}
                                </div>
                              ) : null}
                            </Link>
                          );
                        })}

                        {/* ── Archived section ── */}
                        {archivedThreads.length > 0 && (
                          <div className="flex flex-col mt-1">
                            <button
                              onClick={(e) => toggleArchived(e, room._id!)}
                              className="flex items-center gap-2 pl-7 pr-3 py-1.5 mx-1 rounded-md transition-colors"
                              style={{
                                color: "var(--fab-text-dim)",
                                fontFamily: "var(--font-body)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(80,60,160,0.06)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              {!expandedArchived[room._id!] ? (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                              )}
                              <span
                                className="text-[10px] font-bold tracking-[0.12em] uppercase"
                                style={{ color: "var(--fab-text-dim)" }}
                              >
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
                                      className="relative flex items-center gap-2 pl-11 pr-3 py-1.5 mx-1 rounded-md transition-colors duration-150 group"
                                      style={
                                        isThreadActive
                                          ? {
                                              background:
                                                "var(--fab-teal-light)",
                                              borderLeft:
                                                "3px solid var(--fab-teal)",
                                              paddingLeft:
                                                "calc(2.75rem - 3px)",
                                            }
                                          : undefined
                                      }
                                      onMouseEnter={(e) => {
                                        if (!isThreadActive)
                                          e.currentTarget.style.background =
                                            "rgba(80,60,160,0.06)";
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isThreadActive)
                                          e.currentTarget.style.background =
                                            "transparent";
                                      }}
                                    >
                                      <Hash
                                        className="h-4 w-4 shrink-0"
                                        style={{
                                          color: isThreadActive
                                            ? "var(--fab-teal)"
                                            : "var(--fab-text-dim)",
                                        }}
                                      />
                                      <span
                                        className="text-[13px] font-medium truncate flex-1 opacity-70"
                                        style={{
                                          fontFamily: "var(--font-body)",
                                          color: isThreadActive
                                            ? "var(--fab-teal)"
                                            : "var(--fab-text-muted)",
                                          opacity: isThreadActive ? 1 : 0.7,
                                        }}
                                      >
                                        {thread.title}
                                      </span>

                                      {thread.unreadCount &&
                                      thread._id !== activeThreadId ? (
                                        <div
                                          className="h-4 px-1.5 min-w-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                                          style={{
                                            background: "var(--fab-magenta)",
                                          }}
                                        >
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
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{
                color: "var(--fab-text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              {rooms === undefined ? "Loading…" : "No conversations found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
