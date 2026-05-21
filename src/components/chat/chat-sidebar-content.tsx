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
  const paddingClass = isArchived ? "pl-8" : "pl-5";

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-2 pr-3 py-2 transition-colors border-l-2 border-transparent",
        paddingClass,
        isThreadActive
          ? "bg-[var(--fab-amber-light)] font-bold"
          : "hover:bg-[var(--fab-chat-thread-hover)]",
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
        <div className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-none border border-black bg-[var(--fab-magenta)] px-1.5 text-[9px] font-bold text-white">
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

  const filterProjectThread = React.useCallback(
    (thread: ChatThreadSummary) =>
      !thread.projectId || assignedIdSet.has(thread.projectId),
    [assignedIdSet],
  );

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

  if (roomList.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="border-2 border-black bg-white px-6 py-5 shadow-[4px_4px_0_0_#000]">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fab-text-dim)] font-body">
            No conversations found
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {roomList.map((room) => {
        const roomId = room._id;

        if (!roomId) return null;

        const activeThreads = (room.threads ?? [])
          .filter((thread) => thread.archived !== "Archived")
          .filter((thread) => !assignedOnly || filterProjectThread(thread));
        const archivedThreads = (room.threads ?? [])
          .filter((thread) => thread.archived === "Archived")
          .filter((thread) => !assignedOnly || filterProjectThread(thread));

        return (
          <div
            key={roomId}
            className="mx-2 my-2 flex flex-col border-2 border-black bg-white rounded-lg hover:bg-fab-amber-light transition-colors"
          >
            <div
              onClick={(event) => toggleRoom(event, roomId)}
              className="group relative flex cursor-pointer flex-col gap-0.5 px-3 py-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <div className="flex w-full min-w-0 items-center gap-2">
                <div className=" p-0.5 -ml-1 shrink-0 text-[var(--fab-text-dim)] transition-colors">
                  {collapsedRooms[roomId] ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
                <span className="flex-1 truncate font-body text-[15px] font-medium leading-tight text-[var(--fab-text-primary)]">
                  {room.name}
                </span>
                {room.unreadCount !== undefined && room.unreadCount > 0 ? (
                  <div className="mr-1 h-1.5 w-1.5 shrink-0 rounded-none border border-black bg-[var(--fab-magenta)]" />
                ) : null}
                {room.name ? (
                  <RoomSettingsDialog
                    roomId={roomId as Id<"rooms">}
                    roomName={room.name}
                  />
                ) : null}
              </div>
            </div>

            {activeThreads.length + archivedThreads.length > 0 &&
            !collapsedRooms[roomId] ? (
              <div className="relative flex flex-col">
                <div className="flex flex-col divide-y divide-black/20">
                  {activeThreads.map((thread) => (
                    <ChatThreadLink
                      key={thread._id}
                      roomId={roomId}
                      roomName={room.name}
                      thread={thread}
                      isArchived={false}
                    />
                  ))}
                </div>

                {archivedThreads.length > 0 ? (
                  <div className="flex flex-col border-t border-black/30">
                    <button
                      onClick={(event) => toggleArchived(event, roomId)}
                      className="flex items-center gap-2 bg-[var(--fab-bg-main)] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--fab-text-dim)] transition-colors hover:bg-[var(--fab-amber-light)]"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {expandedArchived[roomId] ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fab-text-dim)]">
                        Archived
                      </span>
                    </button>

                    {expandedArchived[roomId] ? (
                      <div className="flex flex-col divide-y divide-black/20">
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
