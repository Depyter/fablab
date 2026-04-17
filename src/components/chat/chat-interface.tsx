"use client";

import { useState } from "react";
import { Loader2, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";
import { CHAT_ACCEPTED_TYPES } from "@/components/file-upload/utils";
import { useChat } from "./use-chat";
import { MessageAttachments } from "./parts/message-attachments";
import { PendingAttachmentStrip } from "./parts/pending-attachment-strip";
import { ChatInterfaceProps, MessageFile } from "./types";

export function ChatInterface({
  roomId,
  threadId,
  currentUserName,
}: ChatInterfaceProps) {
  const [showTimeId, setShowTimeId] = useState<string | null>(null);

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
  } = useChat({ roomId, threadId });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/25">
              No messages yet
            </span>
          </div>
        ) : (
          <>
            {status === "LoadingMore" && (
              <div className="sticky top-0 z-10 flex items-center justify-center gap-2 rounded-full bg-muted/90 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow backdrop-blur-sm mx-auto w-fit">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading older messages…
              </div>
            )}

            {status === "Exhausted" && (
              <div className="flex justify-center pb-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/25">
                  Beginning of conversation
                </span>
              </div>
            )}

            {messages.map((message, index) => {
              const isCurrentUser = message.sender === currentUserName;

              // ── Time separator (> 1 hr gap) ──────────────────────────────
              const prevMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const showSeparator =
                prevMessage &&
                message._creationTime - prevMessage._creationTime >
                  60 * 60 * 1000;

              // ── Message grouping (< 5 min gap, same sender) ──────────────
              const isFirstInGroup =
                !prevMessage ||
                prevMessage.sender !== message.sender ||
                message._creationTime - prevMessage._creationTime >
                  5 * 60 * 1000;

              const isLastInGroup =
                !nextMessage ||
                nextMessage.sender !== message.sender ||
                nextMessage._creationTime - message._creationTime >
                  5 * 60 * 1000;

              const messageFiles: MessageFile[] =
                "files" in message && Array.isArray(message.files)
                  ? (message.files as MessageFile[])
                  : message.fileUrl
                    ? [
                        {
                          fileUrl: message.fileUrl,
                          fileType: message.fileType || null,
                          originalName: message.originalName || null,
                        },
                      ]
                    : [];

              if (message.sender === "System") {
                return (
                  <div
                    key={message._id}
                    className={cn(
                      "flex flex-col",
                      isFirstInGroup && !showSeparator ? "mt-4" : "mt-0.5",
                    )}
                  >
                    {showSeparator && (
                      <div className="flex items-center gap-4 my-6">
                        <div className="h-px flex-1 bg-border/30" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/35 whitespace-nowrap">
                          {new Date(message._creationTime).toLocaleDateString(
                            [],
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <div className="h-px flex-1 bg-border/30" />
                      </div>
                    )}

                    <div className="flex justify-center">
                      <div className="flex flex-col items-center max-w-[60%]">
                        {isFirstInGroup && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1 px-1">
                            {message.sender}
                          </span>
                        )}

                        <div
                          onClick={() =>
                            setShowTimeId(
                              showTimeId === message._id ? null : message._id,
                            )
                          }
                          className={cn(
                            "text-sm cursor-pointer overflow-hidden bg-muted/50 border border-border/30 text-foreground",
                            message.content
                              ? "px-3.5 py-2.5 rounded-2xl"
                              : messageFiles.length > 0
                                ? "p-1 rounded-2xl"
                                : "px-3.5 py-2.5 rounded-2xl",
                          )}
                        >
                          {message.content && (
                            <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
                              {message.content}
                            </p>
                          )}

                          {messageFiles.length > 0 && (
                            <div className={cn(message.content ? "mt-2" : "")}>
                              <MessageAttachments
                                files={messageFiles}
                                isCurrentUser={false}
                              />
                            </div>
                          )}
                        </div>

                        {showTimeId === message._id && (
                          <span className="text-[10px] mt-1 font-bold uppercase tracking-widest text-muted-foreground/35 px-1">
                            {new Date(message._creationTime).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message._id}
                  className={cn(
                    "flex flex-col",
                    isFirstInGroup && !showSeparator ? "mt-4" : "mt-0.5",
                  )}
                >
                  {showSeparator && (
                    <div className="flex items-center gap-4 my-6">
                      <div className="h-px flex-1 bg-border/30" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/35 whitespace-nowrap">
                        {new Date(message._creationTime).toLocaleDateString(
                          [],
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                      <div className="h-px flex-1 bg-border/30" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex gap-2 max-w-[85%]",
                      isCurrentUser
                        ? "self-end flex-row-reverse"
                        : "self-start",
                    )}
                  >
                    {/* Avatar for non-current user */}
                    {!isCurrentUser && message.sender !== "System" && (
                      <div className="shrink-0 mt-auto mb-1 flex flex-col items-center">
                        {isLastInGroup ? (
                          <div className="h-8 w-8 rounded-full bg-sidebar-accent/50 flex items-center justify-center overflow-hidden border border-sidebar-border shrink-0">
                            {message.senderProfilePicUrl ? (
                              <img
                                src={message.senderProfilePicUrl}
                                alt={message.sender}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-sidebar-foreground/40" />
                            )}
                          </div>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex flex-col",
                        isCurrentUser ? "items-end" : "items-start",
                      )}
                    >
                      {/* Sender name — above bubble, first message in group only */}
                      {!isCurrentUser && isFirstInGroup && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1 px-1">
                          {message.sender}
                        </span>
                      )}

                      <div
                        onClick={() =>
                          setShowTimeId(
                            showTimeId === message._id ? null : message._id,
                          )
                        }
                        className={cn(
                          "max-w-xs lg:max-w-md text-sm cursor-pointer overflow-hidden",
                          // Padding: skip when file-only (no text)
                          message.content
                            ? "px-3.5 py-2.5 rounded-2xl"
                            : messageFiles.length > 0
                              ? "p-1 rounded-2xl"
                              : "px-3.5 py-2.5 rounded-2xl",
                          // Background
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border border-border/30 text-foreground",
                          // Subtle corner flattening for grouped messages
                          isCurrentUser && !isFirstInGroup
                            ? "rounded-tr-md"
                            : "",
                          isCurrentUser && !isLastInGroup
                            ? "rounded-br-md"
                            : "",
                          !isCurrentUser && !isFirstInGroup
                            ? "rounded-tl-md"
                            : "",
                          !isCurrentUser && !isLastInGroup
                            ? "rounded-bl-md"
                            : "",
                        )}
                      >
                        {message.content && (
                          <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
                            {message.content}
                          </p>
                        )}

                        {messageFiles.length > 0 && (
                          <div className={cn(message.content ? "mt-2" : "")}>
                            <MessageAttachments
                              files={messageFiles}
                              isCurrentUser={isCurrentUser}
                            />
                          </div>
                        )}
                      </div>

                      {showTimeId === message._id && (
                        <span className="text-[10px] mt-1 font-bold uppercase tracking-widest text-muted-foreground/35 px-1">
                          {new Date(message._creationTime).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} className="h-2" />
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Input area                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-border/40 bg-background">
        {/* Pending attachments strip */}
        {(pendingAttachments.length > 0 || isUploading) && (
          <div className="px-4 pt-3 space-y-1.5">
            <PendingAttachmentStrip
              attachments={pendingAttachments}
              onRemove={removeAttachment}
            />
            {isUploading && (
              <div className="flex items-center gap-1.5 px-0.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary/50" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">
                  Uploading…
                </span>
              </div>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Pill: attach button + text field */}
          <div className="flex flex-1 items-center gap-1 bg-muted/40 border border-border/30 rounded-2xl px-1.5 py-1 transition-colors focus-within:border-border/60 focus-within:bg-muted/60">
            <FileUpload
              key={fileUploadKey}
              title="Attach files"
              variant="inline"
              multiple={true}
              maxFiles={10}
              accept={CHAT_ACCEPTED_TYPES}
              disabled={isLoading}
              value={fileUploadInitialFiles}
              onFilesChange={handleFilesChange}
              onUploadingChange={setIsUploading}
            />

            <Input
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-sm placeholder:text-muted-foreground/35 disabled:opacity-50"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={!canSend}
            size="icon"
            className={cn(
              "h-9 w-9 rounded-xl shrink-0 transition-all duration-150",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
                : "bg-transparent text-muted-foreground/25 shadow-none pointer-events-none",
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
