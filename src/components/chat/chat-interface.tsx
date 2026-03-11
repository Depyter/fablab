"use client";

import { useState, useEffect, useRef } from "react";
import { FileIcon, Loader2, X, Play } from "lucide-react";
import { MediaGallery, type MediaFile } from "@/components/chat/media-gallery";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload, type UploadedFile } from "@/components/file-upload";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageFile {
  fileUrl: string | null;
  fileType: string | null;
}

// Re-export MediaFile so callers only need one import path if needed.
export type { MediaFile };

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

// ---------------------------------------------------------------------------
// GenericFileAttachment — single non-media file link
// ---------------------------------------------------------------------------

function GenericFileAttachment({
  fileUrl,
  isCurrentUser,
}: {
  fileUrl: string;
  isCurrentUser: boolean;
}) {
  const fileName =
    decodeURIComponent(fileUrl.split("/").pop()?.split("?")[0] ?? "") ||
    "attachment";
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

// ---------------------------------------------------------------------------
// MessageAttachments — top-level renderer for a message's file array
// ---------------------------------------------------------------------------

function MessageAttachments({
  files,
  isCurrentUser,
}: {
  files: MessageFile[];
  isCurrentUser: boolean;
}) {
  const mediaFiles = files.filter(
    (f): f is MediaFile =>
      !!f.fileUrl &&
      (!!f.fileType?.startsWith("image/") ||
        !!f.fileType?.startsWith("video/")),
  );
  const nonMediaFiles = files.filter(
    (f) =>
      !!f.fileUrl &&
      !f.fileType?.startsWith("image/") &&
      !f.fileType?.startsWith("video/"),
  );

  return (
    <div className="space-y-1">
      {mediaFiles.length > 0 && <MediaGallery mediaFiles={mediaFiles} />}
      {nonMediaFiles.map(
        (f, i) =>
          f.fileUrl && (
            <GenericFileAttachment
              key={i}
              fileUrl={f.fileUrl}
              isCurrentUser={isCurrentUser}
            />
          ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PendingAttachmentStrip — thumbnail strip shown above the input
// ---------------------------------------------------------------------------

function PendingAttachmentStrip({
  attachments,
  onRemove,
}: {
  attachments: PendingAttachment[];
  onRemove: (index: number) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
      {attachments.map((attachment, i) => (
        <div
          key={`${attachment.storageId}-${i}`}
          className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border bg-muted"
        >
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${attachment.fileName}`}
            className="absolute top-0.5 right-0.5 z-10 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>

          {attachment.fileType.startsWith("image/") && attachment.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.previewUrl}
              alt={attachment.fileName}
              className="w-full h-full object-cover"
            />
          ) : attachment.fileType.startsWith("video/") &&
            attachment.previewUrl ? (
            <div className="relative w-full h-full bg-black">
              <video
                src={attachment.previewUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/50 p-1">
                  <Play className="h-3.5 w-3.5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1 px-1">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-center truncate w-full text-muted-foreground px-1 leading-tight">
                {attachment.fileName}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatInterface
// ---------------------------------------------------------------------------

export function ChatInterface({ roomId, currentUserName }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  // Increment to remount FileUpload (resets its internal state)
  const [fileUploadKey, setFileUploadKey] = useState(0);
  // Pre-populated files passed to the remounted FileUpload so existing
  // attachments survive when a single file is removed from the strip.
  const [fileUploadInitialFiles, setFileUploadInitialFiles] = useState<
    UploadedFile[]
  >([]);

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

  // Scroll handling
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

  // -------------------------------------------------------------------------
  // Sending
  // -------------------------------------------------------------------------

  const handleSendMessage = async () => {
    const hasText = input.trim();
    const hasFiles = pendingAttachments.length > 0;
    if (!hasText && !hasFiles) return;

    const content = input;
    const attachments = [...pendingAttachments];

    setInput("");
    setPendingAttachments([]);
    setFileUploadInitialFiles([]);
    setFileUploadKey((k) => k + 1);

    try {
      await sendMessage({
        content: content.trim() || "",
        file:
          attachments.length > 0
            ? (attachments.map((a) => a.storageId) as Id<"_storage">[])
            : undefined,
        room: roomId,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore text; files need to be re-attached (they were already uploaded)
      setInput(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // -------------------------------------------------------------------------
  // Attachment management
  // -------------------------------------------------------------------------

  const handleFilesChange = (files: UploadedFile[]) => {
    setPendingAttachments(
      files.map((f) => ({
        storageId: f.storageId,
        fileName: f.fileName,
        fileType: f.fileType,
        previewUrl: f.url,
      })),
    );
  };

  /** Remove a single attachment by index. Re-mounts FileUpload with the rest. */
  const removeAttachment = (index: number) => {
    const remaining = pendingAttachments.filter((_, i) => i !== index);
    const remainingAsUploadedFiles: UploadedFile[] = remaining.map((a) => ({
      storageId: a.storageId,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: 0,
      uploadedAt: new Date(),
      url: a.previewUrl,
    }));
    // Update pending state first (FileUpload won't call onFilesChange on mount
    // due to its isFirstRender guard, so we set it manually here)
    setPendingAttachments(remaining);
    setFileUploadInitialFiles(remainingAsUploadedFiles);
    setFileUploadKey((k) => k + 1);
  };

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const isLoading = status === "LoadingFirstPage";
  const canSend =
    !isLoading &&
    !isUploading &&
    (!!input.trim() || pendingAttachments.length > 0);
  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                             */}
      {/* ------------------------------------------------------------------ */}
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

            {status === "Exhausted" && (
              <div className="flex justify-center py-2">
                <p className="text-xs text-muted-foreground">
                  Beginning of conversation
                </p>
              </div>
            )}

            {sortedMessages.map((message) => {
              const isCurrentUser = message.sender === currentUserName;

              // Normalise files: prefer the resolved `files` array returned by
              // the updated query; fall back to the legacy single-file fields.
              const messageFiles: MessageFile[] =
                "files" in message && Array.isArray(message.files)
                  ? (message.files as MessageFile[])
                  : message.fileUrl
                    ? [
                        {
                          fileUrl: message.fileUrl,
                          fileType:
                            "fileType" in message
                              ? (message.fileType as string | null)
                              : null,
                        },
                      ]
                    : [];

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

                    {messageFiles.length > 0 && (
                      <MessageAttachments
                        files={messageFiles}
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

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Input area                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t p-4 bg-background space-y-2">
        {/* Uploading indicator (while no file has completed yet) */}
        {isUploading && pendingAttachments.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Uploading…</span>
          </div>
        )}

        {/* Pending attachment thumbnail strip */}
        <PendingAttachmentStrip
          attachments={pendingAttachments}
          onRemove={removeAttachment}
        />

        {/* Uploading-more badge — shown while additional files are in flight */}
        {isUploading && pendingAttachments.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading…
          </div>
        )}

        <div className="flex gap-2">
          <FileUpload
            key={fileUploadKey}
            title="Attach files"
            variant="inline"
            multiple={true}
            maxFiles={10}
            disabled={isLoading}
            value={fileUploadInitialFiles}
            onFilesChange={handleFilesChange}
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
