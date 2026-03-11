"use client";

import { useState, useEffect, useRef } from "react";
import { FileIcon, Loader2, X } from "lucide-react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload, type UploadedFile } from "@/components/file-upload";

// ---------------------------------------------------------------------------
// File attachment renderer
// ---------------------------------------------------------------------------

interface FileAttachmentProps {
  fileUrl: string;
  fileType: string | null;
  isCurrentUser: boolean;
}

function FileAttachment({
  fileUrl,
  fileType,
  isCurrentUser,
}: FileAttachmentProps) {
  if (fileType?.startsWith("image/")) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={fileUrl}
          alt="Image attachment"
          className="mt-1 max-w-full rounded-md object-cover"
          style={{ maxHeight: "240px" }}
        />
      </a>
    );
  }

  if (fileType?.startsWith("video/")) {
    return (
      <video
        src={fileUrl}
        controls
        className="mt-1 max-w-full rounded-md"
        style={{ maxHeight: "240px" }}
      />
    );
  }

  // Generic file fallback
  const fileName = fileUrl.split("/").pop()?.split("?")[0] ?? "attachment";
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1 flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-opacity hover:opacity-80",
        isCurrentUser
          ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
          : "border-border bg-background text-foreground",
      )}
    >
      <FileIcon className="h-4 w-4 shrink-0" />
      <span className="truncate">{fileName}</span>
    </a>
  );
}

interface PendingAttachment {
  storageId: string;
  fileName: string;
  fileType: string;
  previewUrl?: string;
}

interface ChatInterfaceProps {
  roomId: Id<"rooms">;
  currentUserName: string;
}

export function ChatInterface({ roomId, currentUserName }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Increment to reset the FileUpload component after a message is sent
  const [fileUploadKey, setFileUploadKey] = useState(0);
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
    const hasText = input.trim();
    const hasFile = !!pendingAttachment;
    if (!hasText && !hasFile) return;

    const content = input;
    const attachment = pendingAttachment;
    setInput("");
    setPendingAttachment(null);
    setFileUploadKey((k) => k + 1);

    try {
      await sendMessage({
        content: content.trim() || "",
        file: attachment?.storageId as Id<"_storage"> | undefined,
        room: roomId,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setInput(content);
      setPendingAttachment(attachment);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUploadComplete = (file: UploadedFile) => {
    setPendingAttachment({
      storageId: file.storageId,
      fileName: file.fileName,
      fileType: file.fileType,
      previewUrl: file.url,
    });
  };

  const clearAttachment = () => {
    setPendingAttachment(null);
    setFileUploadKey((k) => k + 1);
  };

  const isLoading = status === "LoadingFirstPage";
  const canSend =
    !isLoading && !isUploading && (!!input.trim() || !!pendingAttachment);
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
                    {message.content && (
                      <p className="wrap-break-word">{message.content}</p>
                    )}
                    {message.fileUrl && (
                      <FileAttachment
                        fileUrl={message.fileUrl}
                        fileType={
                          "fileType" in message
                            ? (message.fileType as string | null)
                            : null
                        }
                        isCurrentUser={isCurrentUser}
                      />
                    )}
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
      <div className="border-t p-4 bg-background space-y-2">
        {/* Uploading indicator */}
        {isUploading && !pendingAttachment && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Uploading…</span>
          </div>
        )}

        {/* Pending attachment preview — only shown once upload is complete */}
        {pendingAttachment && (
          <div className="relative w-fit max-w-xs rounded-lg overflow-hidden border bg-muted">
            {/* Remove button — always top-right */}
            <button
              type="button"
              onClick={clearAttachment}
              aria-label="Remove attachment"
              className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Image preview */}
            {pendingAttachment.fileType.startsWith("image/") &&
            pendingAttachment.previewUrl ? (
              <img
                src={pendingAttachment.previewUrl}
                alt={pendingAttachment.fileName}
                className="block max-h-48 max-w-xs object-contain"
              />
            ) : pendingAttachment.fileType.startsWith("video/") &&
              pendingAttachment.previewUrl ? (
              /* Video preview */
              <video
                src={pendingAttachment.previewUrl}
                controls
                className="block max-h-48 max-w-xs"
              />
            ) : (
              /* Generic file card */
              <div className="flex items-center gap-3 px-3 py-3 pr-8">
                <div className="h-10 w-10 rounded bg-muted-foreground/20 flex items-center justify-center shrink-0">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="truncate max-w-48 text-xs">
                  {pendingAttachment.fileName}
                </span>
              </div>
            )}

            {/* Filename caption under image/video */}
            {(pendingAttachment.fileType.startsWith("image/") ||
              pendingAttachment.fileType.startsWith("video/")) && (
              <div className="px-2 py-1 text-xs text-muted-foreground truncate">
                {pendingAttachment.fileName}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <FileUpload
            key={fileUploadKey}
            title="Attach file"
            variant="inline"
            multiple={false}
            maxFiles={1}
            disabled={isLoading}
            onUploadComplete={handleUploadComplete}
            onUploadingChange={setIsUploading}
          />
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!canSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
