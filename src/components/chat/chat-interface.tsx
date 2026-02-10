"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  roomId: Id<"rooms">;
  currentUserName: string;
}

export function ChatInterface({ roomId, currentUserName }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages for this room
  const messagesResult = useQuery(api.chat.query.getRoomMessages, {
    room: roomId,
    paginationOpts: { numItems: 50, cursor: null },
  });

  const sendMessage = useMutation(api.chat.mutate.sendMessage);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesResult?.page]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    try {
      await sendMessage({
        content: input,
        room: roomId,
      });
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messages = messagesResult?.page || [];
  const isLoading = messagesResult === undefined;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {messages
              .slice()
              .reverse()
              .map((message) => {
                const isCurrentUser = message.sender === currentUserName;
                return (
                  <div
                    key={message._id}
                    className={cn(
                      "flex",
                      isCurrentUser ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm",
                        isCurrentUser
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none",
                      )}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {message.sender}
                        </p>
                      )}
                      <p className="wrap-break-word">{message.content}</p>
                      <span
                        className={cn(
                          "text-xs mt-1 block",
                          isCurrentUser
                            ? "text-primary-foreground/70"
                            : "text-foreground/70",
                        )}
                      >
                        {new Date(message._creationTime).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
