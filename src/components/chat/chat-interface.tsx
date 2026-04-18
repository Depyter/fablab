"use client";

import { useState } from "react";
import { Loader2, Send, User, Hash, Settings2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";
import { CHAT_ACCEPTED_TYPES } from "@/components/file-upload/utils";
import { useChat } from "./use-chat";
import ReactMarkdown from "react-markdown";
import { MessageAttachments } from "./parts/message-attachments";
import { PendingAttachmentStrip } from "./parts/pending-attachment-strip";
import { PresenceIndicator } from "./presence-indicator";
import { RoomSettingsDialog } from "./room-settings-dialog";
import { ChatInterfaceProps, MessageFile } from "./types";

const AVATAR_COLORS = [
  "var(--fab-magenta)",
  "#534AB7",
  "var(--fab-teal)",
  "#854F0B",
  "#3B6D11",
  "#185FA5",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ThreadTitle({
  roomId,
  threadId,
}: {
  roomId: import("@convex/_generated/dataModel").Id<"rooms">;
  threadId?: string;
}) {
  const threads = useQuery(api.chat.query.getThreads, { roomId });
  const title = threads?.find((t) => t._id === threadId)?.title;

  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      <Hash
        className="h-4 w-4 shrink-0"
        style={{ color: "var(--fab-text-dim)" }}
      />
      <span
        className="text-[13px] font-extrabold uppercase tracking-wide truncate"
        style={{
          fontFamily: "var(--font-display)",
          color: threadId ? "var(--fab-text-primary)" : "var(--fab-text-dim)",
        }}
      >
        {title ?? (threadId ? "channel" : "select a channel")}
      </span>
    </div>
  );
}

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
    <div
      className="flex flex-col h-full relative overflow-hidden"
      style={{ background: "var(--fab-bg-main)" }}
    >
      {/* ── Sticky channel header ────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 shrink-0"
        style={{
          background: "rgba(250,249,255,0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--fab-border-md)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {/* Left accent bar */}
        <div
          className="w-1 h-6 rounded-sm shrink-0"
          style={{ background: "var(--fab-teal)" }}
        />

        {/* Thread name */}
        <ThreadTitle roomId={roomId} threadId={threadId} />

        {/* Presence */}
        {threadId && (
          <PresenceIndicator
            threadId={threadId}
            userId={currentUserName}
            roomId={roomId}
          />
        )}

        {/* Settings */}
        <RoomSettingsDialog
          roomId={roomId}
          roomName=""
          trigger={
            <button
              aria-label="Room settings"
              className="flex items-center justify-center h-8 w-8 rounded-[7px] transition-colors shrink-0"
              style={{ color: "var(--fab-text-dim)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(80,60,160,0.08)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
            >
              <Settings2 className="h-4 w-4" />
            </button>
          }
        />
      </div>
      {/* ── Grid background ───────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(var(--fab-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--fab-grid) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 relative z-[2]"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p
              className="text-sm"
              style={{
                color: "var(--fab-text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              Loading messages...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{
                color: "var(--fab-text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              No messages yet
            </span>
          </div>
        ) : (
          <>
            {status === "LoadingMore" && (
              <div
                className="sticky top-0 z-10 flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow backdrop-blur-sm mx-auto w-fit"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  color: "var(--fab-text-muted)",
                  border: "1px solid var(--fab-border-md)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading older messages…
              </div>
            )}

            {status === "Exhausted" && (
              <div className="flex justify-center pb-5">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: "var(--fab-text-dim)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Beginning of conversation
                </span>
              </div>
            )}

            {messages.map((message, index) => {
              const isCurrentUser = message.sender === currentUserName;

              const prevMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const showSeparator =
                prevMessage &&
                message._creationTime - prevMessage._creationTime >
                  60 * 60 * 1000;

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

              // ── Date separator ─────────────────────────────────────────
              const DateSeparator = showSeparator ? (
                <div className="flex items-center gap-3 my-6">
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--fab-border-md)" }}
                  />
                  <span
                    className="rounded-full px-3 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                    style={{
                      background: "#ffffff",
                      border: "1px solid var(--fab-border-md)",
                      color: "var(--fab-text-muted)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {new Date(message._creationTime).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--fab-border-md)" }}
                  />
                </div>
              ) : null;

              // ── System message ─────────────────────────────────────────
              if (message.sender === "System") {
                return (
                  <div
                    key={message._id}
                    className={cn(
                      "flex flex-col message-enter",
                      isFirstInGroup && !showSeparator ? "mt-4" : "mt-0.5",
                    )}
                  >
                    {DateSeparator}

                    <div className="flex justify-center">
                      <div className="flex flex-col items-center max-w-[60%]">
                        {isFirstInGroup && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest mb-1 px-1"
                            style={{
                              color: "var(--fab-text-dim)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
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
                            "text-sm cursor-pointer overflow-hidden",
                            message.content
                              ? "px-3.5 py-2.5 rounded-2xl"
                              : messageFiles.length > 0
                                ? "p-1 rounded-2xl"
                                : "px-3.5 py-2.5 rounded-2xl",
                          )}
                          style={{
                            background: "rgba(80,60,160,0.06)",
                            border: "1px solid var(--fab-border)",
                            color: "var(--fab-text-muted)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {message.content && (
                            <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-p:leading-relaxed prose-strong:font-semibold prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
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
                          <span
                            className="text-[11px] mt-1 font-semibold px-1"
                            style={{
                              color: "var(--fab-text-dim)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            {new Date(message._creationTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // ── Regular message (Slack-style) ──────────────────────────
              const avatarColor = getAvatarColor(message.sender);
              const initials = getInitials(message.sender);

              return (
                <div key={message._id}>
                  {DateSeparator}

                  {/* Full-width Slack-style row */}
                  <div
                    className={cn(
                      "group message-enter flex items-start gap-3 px-4 rounded-sm transition-colors",
                      isFirstInGroup ? "mt-3" : "mt-0",
                    )}
                    style={{
                      paddingTop: isFirstInGroup ? 6 : 2,
                      paddingBottom: 2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(80,60,160,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Avatar column — fixed 34px width */}
                    <div className="shrink-0 w-[34px]" style={{ marginTop: 2 }}>
                      {isFirstInGroup ? (
                        <div
                          className="flex items-center justify-center overflow-hidden text-white text-[11px] font-bold select-none"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: message.senderProfilePicUrl
                              ? "transparent"
                              : avatarColor,
                          }}
                        >
                          {message.senderProfilePicUrl ? (
                            <img
                              src={message.senderProfilePicUrl}
                              alt={message.sender}
                              className="h-full w-full object-cover"
                              style={{ borderRadius: 8 }}
                            />
                          ) : (
                            initials || <User className="h-4 w-4 opacity-80" />
                          )}
                        </div>
                      ) : (
                        /* Grouped rows: show timestamp on hover in place of avatar */
                        <span
                          className="flex items-center justify-end w-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px] tabular-nums leading-[1.6rem]"
                          style={{
                            color: "var(--fab-text-dim)",
                            fontFamily: "var(--font-body)",
                          }}
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

                    {/* Content column */}
                    <div className="flex flex-col flex-1 min-w-0 max-w-2xl">
                      {/* Header row: name + timestamp — first message in group only */}
                      {isFirstInGroup && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span
                            className="text-[14px] font-bold leading-snug"
                            style={{
                              fontFamily: "var(--font-display)",
                              color: isCurrentUser
                                ? "var(--fab-teal)"
                                : "var(--fab-text-primary)",
                            }}
                          >
                            {message.sender}
                          </span>
                          {isCurrentUser && (
                            <span
                              className="text-[10px] font-bold tracking-[0.06em] uppercase rounded-[4px] px-[5px] py-[2px]"
                              style={{
                                background: "var(--fab-teal-light)",
                                color: "var(--fab-teal)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              you
                            </span>
                          )}
                          <span
                            className="text-[11px] tabular-nums"
                            style={{
                              color: "var(--fab-text-dim)",
                              fontFamily: "var(--font-body)",
                            }}
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
                      )}

                      {/* Message body — plain text, no bubble */}
                      <div
                        className="text-sm leading-relaxed"
                        style={{
                          color: "var(--fab-text-primary)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {message.content && (
                          <div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed prose-strong:font-semibold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-inherit prose-a:text-inherit">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
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
      {/* Input area — sticky bottom                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="sticky bottom-0 z-10 px-4 pb-4 pt-2 shrink-0"
        style={{
          background: "rgba(250,249,255,0.92)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid var(--fab-border)",
        }}
      >
        {/* ── Pending attachments ───────────────────────────────────────── */}
        {(pendingAttachments.length > 0 || isUploading) && (
          <div className="mb-2 space-y-1.5">
            <PendingAttachmentStrip
              attachments={pendingAttachments}
              onRemove={removeAttachment}
            />
            {isUploading && (
              <div className="flex items-center gap-1.5 px-0.5">
                <Loader2
                  className="h-3 w-3 animate-spin"
                  style={{ color: "var(--fab-teal)" }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: "var(--fab-teal)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Uploading…
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Input container ───────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-[10px] transition-all"
          style={{
            background: "#ffffff",
            border: "1px solid var(--fab-border-md)",
            boxShadow: "0 1px 4px rgba(80,60,160,0.06)",
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.border =
              "1px solid rgba(15,168,150,0.5)";
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 0 0 3px rgba(15,168,150,0.08)";
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.border =
              "1px solid var(--fab-border-md)";
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 1px 4px rgba(80,60,160,0.06)";
          }}
        >
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
            className="flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-sm disabled:opacity-50"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--fab-text-primary)",
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!canSend}
            aria-label="Send message"
            className="flex items-center justify-center shrink-0 transition-all duration-150 hover:scale-105"
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: canSend ? "var(--fab-teal)" : "transparent",
              color: canSend ? "#ffffff" : "var(--fab-text-dim)",
              cursor: canSend ? "pointer" : "not-allowed",
              border: "none",
              outline: "none",
            }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
