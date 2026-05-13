"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, ChevronDown, ChevronRight } from "lucide-react";
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
        "group relative flex items-center gap-2 transition-colors duration-150",
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
          className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
          style={{ background: "var(--fab-magenta)" }}
        >
          {thread.unreadCount}
        </div>
      ) : null}
    </Link>
  );
}

export function ChatSidebarContent({
  assignedOnly = false,
  assignedProjectIds,
}: {
  assignedOnly?: boolean;
  assignedProjectIds?: readonly Id<"projects">[];
}) {
  const { roomList, isLoading } = useChatRooms();

  const assignedIdSet = React.useMemo(
    () => new Set<string>(assignedProjectIds ?? []),
    [assignedProjectIds],
  );

  const filteredRoomList = React.useMemo(() => {
    if (!assignedOnly || assignedIdSet.size === 0) return roomList;

    return roomList.filter((room) =>
      room.threads?.some((thread) =>
        thread.projectId ? assignedIdSet.has(thread.projectId) : false,
      ),
    );
  }, [roomList, assignedOnly, assignedIdSet]);

  const [collapsedRooms, setCollapsedRooms] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedArchived, setExpandedArchived] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRoom = (event: React.MouseEvent, roomId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setCollapsedRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  const toggleArchived = (event: React.MouseEvent, roomId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedArchived((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  if (isLoading) {
    return <ChatSidebarRoomsLoading />;
  }

  if (filteredRoomList.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{
            color: "var(--fab-text-dim)",
            fontFamily: "var(--font-body)",
          }}
        >
          {assignedOnly
            ? "No assigned conversations"
            : "No conversations found"}
        </p>
      </div>
    );
  }

  return (
    <>
      {filteredRoomList.map((room) => {
        const roomId = room._id;

        if (!roomId) return null;

        const activeThreads =
          room.threads?.filter((thread) => thread.archived !== "Archived") ??
          [];
        const archivedThreads =
          room.threads?.filter((thread) => thread.archived === "Archived") ??
          [];

        return (
          <div key={roomId} className="flex flex-col">
            <div
              onClick={(event) => toggleRoom(event, roomId)}
              className="group relative mx-1 flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background =
                  "var(--fab-chat-thread-hover)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
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
            !collapsedRooms[roomId] ? (
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
                      onClick={(event) => toggleArchived(event, roomId)}
                      className="mx-1 flex items-center gap-2 rounded-md py-1.5 pl-7 pr-3 transition-colors"
                      style={{
                        color: "var(--fab-text-dim)",
                        fontFamily: "var(--font-body)",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background =
                          "rgba(80,60,160,0.06)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
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
            ) : null}
          </div>
        );
      })}
    </>
  );
}
