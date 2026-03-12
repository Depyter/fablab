"use client";

import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";
import { useChat } from "./use-chat";
import { MessageAttachments } from "./parts/message-attachments";
import { PendingAttachmentStrip } from "./parts/pending-attachment-strip";
import { ChatInterfaceProps, MessageFile } from "./types";

export function ChatInterface({ roomId, currentUserName }: ChatInterfaceProps) {
  const {
    input,
    setInput,
    messages,
    status,
    isLoading,
    canSend,
    isUploading,
    setIsUploading,
    pendingAttachments,
    fileUploadKey,
    fileUploadInitialFiles,
    scrollContainerRef,
    bottomRef,
    handleScroll,
    handleSendMessage,
    handleKeyPress,
    handleFilesChange,
    removeAttachment,
  } = useChat({ roomId });

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
        ) : messages.length === 0 ? (
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

            {messages.map((message) => {
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
                          originalName:
                            "originalName" in message
                              ? (message.originalName as string | null)
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
