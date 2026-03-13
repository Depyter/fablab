"use client";

import { useState } from "react";
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
            <p className="text-muted-foreground text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-center p-8">
            <p className="text-muted-foreground text-sm max-w-[240px]">
              No messages yet. Start the conversation!
            </p>
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
              <div className="flex justify-center py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Beginning of conversation
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const isCurrentUser = message.sender === currentUserName;

              // Separator logic (1hr gap)
              const prevMessage = messages[index - 1];
              const showSeparator =
                prevMessage &&
                message._creationTime - prevMessage._creationTime >
                  60 * 60 * 1000;

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

              return (
                <div key={message._id} className="space-y-1">
                  {showSeparator && (
                    <div className="flex items-center gap-4 my-8">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
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
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col",
                      isCurrentUser ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      onClick={() =>
                        setShowTimeId(
                          showTimeId === message._id ? null : message._id,
                        )
                      }
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm cursor-pointer ",
                        isCurrentUser
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-secondary text-secondary-foreground rounded-bl-none",
                      )}
                    >
                      {!isCurrentUser && (
                        <p className="text-[11px] font-bold mb-1 opacity-70 uppercase tracking-tight">
                          {message.sender}
                        </p>
                      )}

                      {message.content && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                      )}

                      {messageFiles.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments
                            files={messageFiles}
                            isCurrentUser={isCurrentUser}
                          />
                        </div>
                      )}
                    </div>

                    {showTimeId === message._id && (
                      <span
                        className={cn(
                          "text-[10px] mt-1 font-bold uppercase tracking-widest text-muted-foreground/60 px-1",
                          isCurrentUser ? "text-right" : "text-left",
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
                    )}
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
      <div className="border-t p-4 bg-background/95 backdrop-blur-md space-y-3">
        {isUploading && pendingAttachments.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-muted text-sm w-fit border border-primary/10">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
            <span className="text-primary text-xs font-semibold">
              Uploading…
            </span>
          </div>
        )}

        <PendingAttachmentStrip
          attachments={pendingAttachments}
          onRemove={removeAttachment}
        />

        {isUploading && pendingAttachments.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary/60 px-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading more…
          </div>
        )}

        <div className="flex items-end gap-3 max-w-6xl mx-auto">
          <div className="flex items-center">
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
          </div>

          <div className="relative flex-1 group">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className={cn(
                "w-full min-h-[44px] px-4 py-2",
                "bg-sidebar-accent/50 border-sidebar-border/50 shadow-none",
                "focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-sidebar-accent",
                "transition-all duration-200 placeholder:text-muted-foreground/50",
                "rounded-xl font-sans",
              )}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!canSend}
            size="icon"
            className={cn(
              "rounded-xl h-11 w-11 shrink-0 transition-all duration-200 shadow-sm",
              canSend
                ? "bg-primary text-primary-foreground hover:shadow-md hover:scale-[1.02]"
                : "bg-gray-300 text-black",
            )}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
