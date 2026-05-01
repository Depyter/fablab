"use client";

import * as React from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export interface ChatThreadSummary {
  _id: string;
  title: string;
  lastMessageText?: string;
  unreadCount?: number;
  archived?: "Archived" | "Active";
}

export interface ChatRoomSummary {
  _id?: string;
  _creationTime?: number;
  name?: string;
  members?: string;
  color?: string;
  lastMessageText?: string;
  lastMessageAt?: number;
  unreadCount?: number;
  threads?: ChatThreadSummary[];
}

interface ChatRoomsContextValue {
  roomList: ChatRoomSummary[];
  isLoading: boolean;
}

const ChatRoomsContext = React.createContext<ChatRoomsContextValue | null>(
  null,
);

export function ChatRoomsProvider({
  preloadedRooms,
  children,
}: {
  preloadedRooms: Preloaded<typeof api.chat.query.getRooms>;
  children: React.ReactNode;
}) {
  const rooms = usePreloadedAuthQuery(preloadedRooms) as
    | (ChatRoomSummary | null)[]
    | undefined;

  const roomList = React.useMemo(
    () => (rooms?.filter(Boolean) as ChatRoomSummary[]) ?? [],
    [rooms],
  );

  const value = React.useMemo(
    () => ({
      roomList,
      isLoading: rooms === undefined,
    }),
    [roomList, rooms],
  );

  return (
    <ChatRoomsContext.Provider value={value}>
      {children}
    </ChatRoomsContext.Provider>
  );
}

export function useChatRooms() {
  const value = React.useContext(ChatRoomsContext);

  if (!value) {
    throw new Error("useChatRooms must be used within a ChatRoomsProvider");
  }

  return value;
}

export function useChatThreadTitle(
  roomId: Id<"rooms">,
  threadId: Id<"threads">,
) {
  const { roomList } = useChatRooms();

  return React.useMemo(() => {
    const room = roomList.find((entry) => entry._id === roomId);
    return room?.threads?.find((thread) => thread._id === threadId)?.title;
  }, [roomId, roomList, threadId]);
}
