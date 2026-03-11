"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileIcon,
  Loader2,
  X,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
// MediaLightbox — full-screen dialog viewer with prev/next navigation
// ---------------------------------------------------------------------------

function MediaLightbox({
  mediaFiles,
  current,
  setCurrent,
  open,
  onOpenChange,
}: {
  mediaFiles: Array<{ fileUrl: string; fileType: string | null }>;
  current: number;
  setCurrent: React.Dispatch<React.SetStateAction<number>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const count = mediaFiles.length;
  const f = mediaFiles[current];
  if (!f) return null;

  const prev = () => setCurrent((c) => (c - 1 + count) % count);
  const next = () => setCurrent((c) => (c + 1) % count);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Dim backdrop — clicking it closes the lightbox */}
        <DialogOverlay
          className="bg-black/60"
          onClick={() => onOpenChange(false)}
        />

        {/* Full-viewport container — no max-w, no padding, no rounding */}
        <div
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onKeyDown={handleKey}
          tabIndex={-1}
          autoFocus
        >
          <DialogTitle className="sr-only">
            Media {current + 1} of {count}
          </DialogTitle>

          {/* Top bar — close left, counter right */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          {/* Media area — clicking empty gutters/background closes; only media + controls stop propagation */}
          <div
            className="relative flex-1 flex items-center justify-center min-h-0 px-12 cursor-default"
            onClick={() => onOpenChange(false)}
          >
            {f.fileType?.startsWith("video/") ? (
              <video
                key={f.fileUrl}
                src={f.fileUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                key={f.fileUrl}
                src={f.fileUrl}
                alt={`Media ${current + 1} of ${count}`}
                className="max-h-full max-w-full object-contain rounded-sm"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Prev arrow */}
            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-2 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next arrow */}
            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-2 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom counter + dot-strip — always visible */}
          <div className="flex flex-col items-center gap-1.5 py-3 shrink-0">
            <span className="text-xs text-white/40 tabular-nums select-none">
              {current + 1} / {count}
            </span>
            {count > 1 && (
              <div className="flex gap-1.5">
                {mediaFiles.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrent(i);
                    }}
                    aria-label={`Go to ${i + 1}`}
                    className={cn(
                      "h-1 rounded-full transition-all duration-200",
                      i === current
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/30 hover:bg-white/60",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MediaGallery — renders 1-N image/video files inside a message bubble
// ---------------------------------------------------------------------------

function MediaGallery({
  mediaFiles,
}: {
  mediaFiles: Array<{ fileUrl: string; fileType: string | null }>;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxCurrent, setLightboxCurrent] = useState(0);

  const openAt = (index: number) => {
    setLightboxCurrent(index);
    setLightboxOpen(true);
  };

  const count = mediaFiles.length;
  if (count === 0) return null;

  // Single media item — full-width display, click opens lightbox
  if (count === 1) {
    const f = mediaFiles[0];
    return (
      <>
        <button
          type="button"
          onClick={() => openAt(0)}
          className="mt-1 block w-full text-left focus:outline-none"
        >
          {f.fileType?.startsWith("video/") ? (
            <div
              className="relative rounded-md overflow-hidden bg-black"
              style={{ maxHeight: "240px" }}
            >
              <video
                src={f.fileUrl}
                className="max-w-full max-h-60 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/50 p-2">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={f.fileUrl}
              alt="Image attachment"
              className="max-w-full rounded-md object-cover hover:opacity-95 transition-opacity"
              style={{ maxHeight: "240px" }}
            />
          )}
        </button>
        <MediaLightbox
          mediaFiles={mediaFiles}
          current={lightboxCurrent}
          setCurrent={setLightboxCurrent}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      </>
    );
  }

  // Multiple media — 2-column grid, max 4 cells shown; remainder shown as "+N"
  const visibleFiles = mediaFiles.slice(0, 4);
  const remaining = count - 4;

  return (
    <>
      <div className="mt-1 grid grid-cols-2 gap-0.5 rounded-md overflow-hidden">
        {visibleFiles.map((f, i) => {
          const isFirstOfThree = count === 3 && i === 0;
          const isLastVisible = i === visibleFiles.length - 1 && remaining > 0;

          return (
            <button
              key={i}
              type="button"
              onClick={() => openAt(i)}
              className={cn(
                "relative overflow-hidden focus:outline-none",
                isFirstOfThree ? "col-span-2" : "",
              )}
            >
              {f.fileType?.startsWith("video/") ? (
                <div className="relative w-full h-28 bg-black">
                  <video
                    src={f.fileUrl}
                    className="w-full h-full object-cover"
                  />
                  {!isLastVisible && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full bg-black/50 p-1.5">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={f.fileUrl}
                  alt={`Image ${i + 1}`}
                  className={cn(
                    "w-full object-cover hover:brightness-90 transition-[filter]",
                    isFirstOfThree ? "h-36" : "h-28",
                  )}
                />
              )}

              {/* "+N more" overlay on the last visible cell */}
              {isLastVisible && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    +{remaining + 1}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <MediaLightbox
        mediaFiles={mediaFiles}
        current={lightboxCurrent}
        setCurrent={setLightboxCurrent}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
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
    (f): f is { fileUrl: string; fileType: string | null } =>
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
