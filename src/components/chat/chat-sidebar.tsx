"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, ChevronDown, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Id } from "@convex/_generated/dataModel";
import { RoomSettingsDialog } from "./room-settings-dialog";
import { ChatThreadSummary, useChatRooms } from "./chat-rooms-context";
import { ChatSidebarRoomsLoading } from "./chat-loading";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

function ChatThreadLink({
  roomId,
  roomName,
  thread,
  isArchived,
}: {
  roomId: string;
  roomName?: string;
  thread: ChatThreadSummary;
  isArchived: boolean;
}) {
  const pathname = usePathname();
  const href = `/dashboard/chat/${roomId}/${thread._id}`;
  const isThreadActive = pathname === href;
  const hasUnreads = Boolean(thread.unreadCount && thread.unreadCount > 0);

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 transition-colors duration-150 group",
        isArchived ? "pl-11 pr-3 py-2" : "pl-7 pr-3 py-2",
      )}
      onClick={() =>
        posthog.capture("chat_thread_opened", {
          room_id: roomId,
          room_name: roomName,
          thread_id: thread._id,
          thread_title: thread.title,
          is_archived: isArchived,
        })
      }
      style={
        isThreadActive
          ? {
              background: "var(--fab-amber-light)",
              borderLeft: "4px solid var(--fab-amber)",
              paddingLeft: isArchived
                ? "calc(2.75rem - 4px)"
                : "calc(1.75rem - 4px)",
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (!isThreadActive) {
          e.currentTarget.style.background = "var(--fab-chat-thread-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isThreadActive) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <Hash
        className="h-4 w-4 shrink-0"
        style={{
          color: isThreadActive
            ? isArchived
              ? "var(--fab-text-primary)"
              : "var(--foreground)"
            : hasUnreads && !isArchived
              ? "var(--fab-magenta)"
              : "var(--fab-text-dim)",
        }}
      />
      <span
        className={cn(
          "truncate flex-1",
          isArchived ? "text-[13px]" : "text-[14px]",
          isThreadActive && "font-bold",
          !isArchived && hasUnreads && !isThreadActive && "font-extrabold",
          !isArchived && !hasUnreads && !isThreadActive && "font-medium",
          isArchived && !isThreadActive && "font-medium opacity-70",
        )}
        style={{
          fontFamily: "var(--font-body)",
          color: isThreadActive
            ? isArchived
              ? "var(--fab-text-primary)"
              : "var(--foreground)"
            : hasUnreads && !isArchived
              ? "var(--fab-text-primary)"
              : "var(--fab-text-muted)",
          opacity: isArchived && !isThreadActive ? 0.7 : 1,
        }}
      >
        {thread.title}
      </span>

      {hasUnreads && !isThreadActive ? (
        <div
          className="h-4 min-w-4 shrink-0 rounded-full px-1.5 text-[10px] font-bold text-white flex items-center justify-center"
          style={{ background: "var(--fab-magenta)" }}
        >
          {thread.unreadCount}
        </div>
      ) : null}
    </Link>
  );
}

export function ChatSidebar({ className }: { className?: string }) {
  const { roomList, isLoading } = useChatRooms();

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

  return (
    <div
      className={cn("flex flex-col h-full overflow-hidden", className)}
      style={{
        background:
          "linear-gradient(180deg, var(--fab-bg-sidebar) 0%, rgba(250,249,255,0.8) 100%)",
      }}
    >
      <div
        className="flex h-14 shrink-0 items-center gap-2 px-3"
        style={{ borderBottom: "1px solid var(--fab-border-md)" }}
      >
        <SidebarTrigger className="text-(--fab-text-dim) hover:text-(--fab-text-primary) transition-colors" />
        <div className="flex flex-1 items-center gap-2">
          <span
            className="text-[12px] font-black uppercase tracking-[0.15em]"
            style={{
              color: "var(--fab-text-primary)",
              fontFamily: "var(--font-body)",
            }}
          >
            Messaging
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <ChatSidebarRoomsLoading />
        ) : roomList.length > 0 ? (
          roomList.map((room) => {
            const roomId = room._id;

            if (!roomId) return null;

            const activeThreads =
              room.threads?.filter(
                (thread) => thread.archived !== "Archived",
              ) ?? [];
            const archivedThreads =
              room.threads?.filter(
                (thread) => thread.archived === "Archived",
              ) ?? [];

            return (
              <div key={roomId} className="flex flex-col">
                <div
                  onClick={(e) => toggleRoom(e, roomId)}
                  className="relative mx-1 flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 transition-colors group"
                  style={{ fontFamily: "var(--font-body)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--fab-chat-thread-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="flex w-full min-w-0 items-center gap-2">
                    <div
                      className="rounded p-0.5 -ml-1 shrink-0 transition-colors"
                      style={{ color: "var(--fab-text-dim)" }}
                    >
                      {collapsedRooms[roomId] ? (
                        <ChevronRight className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className="flex-1 truncate font-body text-[15px] font-medium leading-tight"
                      style={{ color: "var(--fab-text-primary)" }}
                    >
                      {room.name}
                    </span>
                    {room.unreadCount !== undefined && room.unreadCount > 0 ? (
                      <div
                        className="mr-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: "var(--fab-magenta)" }}
                      />
                    ) : null}
                    {room.name ? (
                      <RoomSettingsDialog
                        roomId={roomId as Id<"rooms">}
                        roomName={room.name}
                      />
                    ) : null}
                  </div>
                </div>

                {room.threads &&
                  room.threads.length > 0 &&
                  !collapsedRooms[roomId] && (
                    <div className="relative flex flex-col pb-2">
                      {activeThreads.map((thread) => (
                        <ChatThreadLink
                          key={thread._id}
                          roomId={roomId}
                          roomName={room.name}
                          thread={thread}
                          isArchived={false}
                        />
                      ))}

                      {archivedThreads.length > 0 ? (
                        <div className="mt-1 flex flex-col">
                          <button
                            onClick={(e) => toggleArchived(e, roomId)}
                            className="mx-1 flex items-center gap-2 rounded-md py-1.5 pl-7 pr-3 transition-colors"
                            style={{
                              color: "var(--fab-text-dim)",
                              fontFamily: "var(--font-body)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(80,60,160,0.06)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {expandedArchived[roomId] ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.12em]"
                              style={{ color: "var(--fab-text-dim)" }}
                            >
                              Archived
                            </span>
                          </button>

                          {expandedArchived[roomId] ? (
                            <div className="mt-0.5 flex flex-col">
                              {archivedThreads.map((thread) => (
                                <ChatThreadLink
                                  key={thread._id}
                                  roomId={roomId}
                                  roomName={room.name}
                                  thread={thread}
                                  isArchived={true}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
              </div>
            );
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{
                color: "var(--fab-text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              No conversations found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
