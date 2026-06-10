import type { Doc, Id } from "@convex/_generated/dataModel";
import * as React from "react";

export interface ChatThreadSummary {
  _id: string;
  title: string;
  lastMessageText?: string;
  unreadCount?: number;
  archived?: "Archived" | "Active";
  projectId?: string;
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
  threads?: Array<ChatThreadSummary>;
}

interface ChatRoomsContextValue {
  roomList: Array<ChatRoomSummary>;
  isPending: boolean;
}

const ChatRoomsContext = React.createContext<ChatRoomsContextValue | null>(
  null,
);

export function ChatRoomsProvider({
  children,
  isPending,
  rooms,
}: React.PropsWithChildren<{
  rooms: Array<Doc<"rooms">> | undefined;
  isPending: boolean;
}>) {
  const roomList = React.useMemo(
    () => (rooms?.filter(Boolean) as Array<ChatRoomSummary>) ?? [],
    [rooms],
  );

  return (
    <ChatRoomsContext.Provider value={{ roomList, isPending }}>
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
