"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { Id } from "@convex/_generated/dataModel";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatDebugPage() {
  const [roomId, setRoomId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendMessage = useMutation(api.chat.mutate.sendMessage);

  // Only fetch messages if we have a valid room ID
  const messages = useQuery(
    api.chat.query.getRoomMessages,
    roomId
      ? {
          room: roomId as Id<"rooms">,
          paginationOpts: { numItems: 20, cursor: null },
        }
      : "skip",
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    if (!message.trim()) {
      setError("Message content is required");
      return;
    }

    if (!sender.trim()) {
      setError("Sender name is required");
      return;
    }

    try {
      await sendMessage({
        content: message,
        room: roomId as Id<"rooms">,
      });
      setMessage("");
      setSuccess("Message sent successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  return <ChatInterface />;
}
