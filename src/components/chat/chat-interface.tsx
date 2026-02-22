"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { usePaginatedQuery, useMutation } from "convex/react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chat.query.getRoomMessages,
    { room: roomId },
    { initialNumItems: 50 },
  );

  const sendMessage = useMutation(api.chat.mutate.sendMessage);

  // Combined scroll handler:
  //  - tracks whether the user is near the bottom (for auto-scroll on new messages)
  //  - triggers loadMore when the user scrolls to the top
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

    if (
      scrollTop < 100 &&
      status === "CanLoadMore" &&
      !isLoadingMoreRef.current
    ) {
      isLoadingMoreRef.current = true;
      prevScrollHeightRef.current = scrollHeight;
      loadMore(50);
    }
  };

  // When messages change:
  //  - first load: scroll instantly to the bottom so the user sees the newest messages
  //  - loaded more (older messages): restore scroll position so the viewport doesn't jump
  //  - new real-time message: smooth-scroll to bottom only if already near it
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (!initialScrollDoneRef.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
      initialScrollDoneRef.current = true;
      return;
    }

    if (isLoadingMoreRef.current) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop += newScrollHeight - prevScrollHeightRef.current;
      isLoadingMoreRef.current = false;
      return;
    }

    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const content = input;
    setInput("");

    try {
      await sendMessage({ content, room: roomId });
    } catch (error) {
      console.error("Failed to send message:", error);
      setInput(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isLoading = status === "LoadingFirstPage";
  // Query returns newest-first (desc); reverse so oldest renders at the top
  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {status === "LoadingMore" && (
              <div className="sticky top-0 z-10 flex items-center justify-center gap-2 rounded-full bg-muted/90 px-4 py-1.5 text-sm text-muted-foreground shadow backdrop-blur-sm mx-auto w-fit">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading older messages…
              </div>
            )}

            {/* Top of history marker */}
            {status === "Exhausted" && (
              <div className="flex justify-center py-2">
                <p className="text-xs text-muted-foreground">
                  Beginning of conversation
                </p>
              </div>
            )}

            {sortedMessages.map((message) => {
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
                      {new Date(message._creationTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Bottom sentinel — used to scroll into view on new messages */}
            <div ref={bottomRef} />
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
