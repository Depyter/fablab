"use client";

import { useState } from "react";

import { Loader2, Send, User, Hash, ArrowLeft, Clock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SystemMessageCard } from "./parts/system-message-card";
import type { Id } from "@convex/_generated/dataModel";
import { formatLabDate } from "@/lib/lab-time";
import { getStatusLabel } from "@/lib/project-type-meta";
import { FileUpload } from "@/components/file-upload";
import { CHAT_ACCEPTED_TYPES } from "@/components/file-upload/utils";
import { useChat } from "./use-chat";
import ReactMarkdown from "react-markdown";
import { MessageAttachments } from "./parts/message-attachments";
import { PendingAttachmentStrip } from "./parts/pending-attachment-strip";
import { PresenceIndicator } from "./presence-indicator";
import { ChatInterfaceProps, MessageFile } from "./types";
import { ChatMessagesSkeletonList } from "./chat-loading";
import Image from "next/image";
import posthog from "posthog-js";

const AVATAR_COLORS = [
  "var(--fab-magenta)",
  "var(--chart-4)", // Purple
  "var(--fab-teal)",
  "var(--fab-amber)",
  "#534AB7",
  "#0FA896",
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

function ThreadTitle({ title }: { title?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="h-6 w-6 rounded-none flex items-center justify-center shrink-0">
        <Hash className="h-3.5 w-3.5 text-[var(--fab-text-primary)]" />
      </div>
      <span className="font-mono text-[17px] font-black tracking-tight truncate text-[var(--fab-text-primary)]">
        {title ?? "channel"}
      </span>
    </div>
  );
}

/**
 * Shows a warning banner when the thread belongs to a project that has reached
 * a terminal status (cancelled, rejected, or claimed) and is pending archival.
 */
function ArchivalBanner({ threadId }: { threadId: Id<"threads"> }) {
  const info = useQuery(api.chat.query.getThreadProjectStatus, { threadId });

  if (!info) return null;

  const statusLabel = getStatusLabel(
    info.status as Parameters<typeof getStatusLabel>[0],
    info.type,
  );

  const deadlineDate =
    info.archivalDeadline !== null
      ? formatLabDate(info.archivalDeadline, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hourCycle: "h12",
        })
      : null;

  if (!deadlineDate) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 px-4 py-2 text-[11px] font-semibold text-[var(--fab-text-primary)] border-b-2 border-black bg-[var(--fab-amber-light)]">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>
        This project has been marked as <strong>{statusLabel}</strong>. Thread
        will be archived on <strong>{deadlineDate}</strong>.
      </span>
    </div>
  );
}

export function ChatInterface({
  roomId,
  threadId,
  threadTitle,
  currentUserName,
  showBackButton,
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
    uploadingFiles,
    pendingAttachments,
    fileUploadKey,
    fileUploadInitialFiles,
    scrollContainerRef,
    topSentinelRef,
    bottomRef,
    handleSendMessage,
    handleKeyPress,
    handleFilesChange,
    handleUploadError,
    handleUploadingFilesChange,
    removeAttachment,
  } = useChat({ roomId, threadId });

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--fab-bg-main)]">
      {/* ── Sticky channel header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 shrink-0 border-b-2 border-black bg-white">
        {/* Back button — mobile only */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="md:hidden -ml-2 shrink-0 rounded-none border-2 border-black bg-white "
          >
            <Link href="/dashboard/chat">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}

        {/* Thread name */}
        <ThreadTitle title={threadTitle} />

        {/* Presence */}
        <PresenceIndicator
          threadId={threadId}
          userId={currentUserName}
          roomId={roomId}
        />
      </div>

      {/* ── Archival warning banner ──────────────────────────────────────── */}
      <ArchivalBanner threadId={threadId} />

      {/* ── Grid background ───────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 bg-[linear-gradient(var(--fab-grid)_1px,transparent_1px),linear-gradient(90deg,var(--fab-grid)_1px,transparent_1px)] [background-size:28px_28px]"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-4 sm:px-3 md:px-4 relative z-[1]"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {isLoading ? (
          <ChatMessagesSkeletonList />
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="border-2 border-black bg-white px-6 py-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fab-text-dim)]">
                No messages yet
              </span>
            </div>
          </div>
        ) : (
          <>
            <div ref={topSentinelRef} aria-hidden="true" className="h-px" />

            {status === "LoadingMore" && (
              <div className="sticky top-0 z-10 mx-auto flex w-fit items-center justify-center gap-2 border-2 border-black bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--fab-text-muted)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading older messages…
              </div>
            )}

            {status === "Exhausted" && (
              <div className="flex justify-center pb-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fab-text-dim)]">
                  Beginning of conversation
                </span>
              </div>
            )}

            {messages.map((message, index) => {
              const isCurrentUser = message.sender === currentUserName;

              const prevMessage = messages[index - 1];
              const showSeparator =
                prevMessage &&
                message._creationTime - prevMessage._creationTime >
                  60 * 60 * 1000;

              const isFirstInGroup =
                !prevMessage ||
                prevMessage.sender !== message.sender ||
                message._creationTime - prevMessage._creationTime >
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
                <div className="flex items-center gap-4 my-8">
                  <div className="h-[2px] flex-1 bg-black" />
                  <span className="border-2 border-black bg-[var(--fab-amber-light)] px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fab-text-primary)] ">
                    {new Date(message._creationTime).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <div className="h-[2px] flex-1 bg-black" />
                </div>
              ) : null;

              // ── System message ─────────────────────────────────────────
              if (message.sender === "System") {
                return (
                  <div key={message._id}>
                    {DateSeparator}

                    <div
                      className={cn(
                        "group flex items-start gap-2 px-2 transition-colors sm:gap-3 sm:px-3 md:px-4",
                        isFirstInGroup ? "mt-2" : "mt-0.5",
                      )}
                      style={{
                        paddingTop: isFirstInGroup ? 4 : 0,
                        paddingBottom: isFirstInGroup ? 1 : 0,
                      }}
                    >
                      <div
                        className="w-8.5 shrink-0"
                        style={{ marginTop: isFirstInGroup ? 2 : 0 }}
                      >
                        {isFirstInGroup ? (
                          <div className="flex size-8.5 items-center justify-center overflow-hidden rounded-none border-2 border-black bg-white">
                            <Image
                              src="/fablab.jpg"
                              alt="System"
                              className="h-7.5 w-7.5"
                              width="30"
                              height="30"
                            />
                          </div>
                        ) : (
                          <span className="flex w-full items-center justify-end pt-1 text-[9px] leading-none tabular-nums opacity-0 transition-opacity group-hover:opacity-100 text-[var(--fab-text-dim)]">
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

                      <div className="flex max-w-2xl min-w-0 flex-1 flex-col">
                        {isFirstInGroup ? (
                          <div className="mb-0.5 flex items-baseline gap-2">
                            <span className="text-[14px] font-black leading-snug text-[var(--fab-text-primary)]">
                              System
                            </span>
                            <span className="border-2 border-black bg-amber-100 px-1.5 py-0.5 text-[9px] leading-none font-black uppercase tracking-wider text-amber-700">
                              System
                            </span>
                            <span className="text-[11px] tabular-nums text-[var(--fab-text-dim)]">
                              {new Date(
                                message._creationTime,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : null}

                        <div
                          onClick={() =>
                            setShowTimeId(
                              showTimeId === message._id ? null : message._id,
                            )
                          }
                          className="rounded-md border-2 border-black bg-[var(--fab-chat-system-bg)] px-3 py-2 text-sm leading-relaxed text-[var(--fab-text-muted)] cursor-pointer"
                        >
                          <SystemMessageCard
                            content={message.content}
                            files={messageFiles}
                          />
                        </div>

                        {showTimeId === message._id && (
                          <span className="text-[10px] mt-1.5 font-black uppercase tracking-widest opacity-50 text-[var(--fab-text-dim)]">
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
                      "group flex items-start gap-2 px-2 transition-colors hover:bg-[var(--fab-amber-light)] sm:gap-3 sm:px-3 md:px-4",
                      isFirstInGroup ? "mt-2" : "mt-0.5",
                    )}
                    style={{
                      paddingTop: isFirstInGroup ? 4 : 0,
                      paddingBottom: isFirstInGroup ? 1 : 0,
                    }}
                  >
                    {/* Avatar column — fixed 34px width */}
                    <div
                      className="shrink-0 w-8.5"
                      style={{ marginTop: isFirstInGroup ? 2 : 0 }}
                    >
                      {isFirstInGroup ? (
                        <div
                          className="flex items-center justify-center overflow-hidden text-white text-[11px] font-bold select-none border-2 border-black"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 0,
                            background: message.senderProfilePicUrl
                              ? "transparent"
                              : avatarColor,
                          }}
                        >
                          {message.senderProfilePicUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={message.senderProfilePicUrl}
                              alt={message.sender}
                              className="h-full w-full object-cover"
                              style={{ borderRadius: 0 }}
                            />
                          ) : (
                            initials || <User className="h-4 w-4 opacity-80" />
                          )}
                        </div>
                      ) : (
                        /* Grouped rows: show timestamp on hover in place of avatar */
                        <span
                          className="flex items-center justify-end w-full opacity-0 group-hover:opacity-100 transition-opacity text-[9px] tabular-nums leading-none pt-1"
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
                      {isFirstInGroup ? (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span
                            className="text-[14px] font-bold leading-snug"
                            style={{
                              fontFamily: "var(--font-body)",
                              color: isCurrentUser
                                ? "var(--fab-teal)"
                                : "var(--fab-text-primary)",
                            }}
                          >
                            {message.sender}
                          </span>
                          {"senderRole" in message && message.senderRole && (
                            <span
                              className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-none border-2 border-black leading-none"
                              style={{
                                background:
                                  message.senderRole === "admin"
                                    ? "var(--fab-magenta-light)"
                                    : message.senderRole === "maker"
                                      ? "var(--fab-teal-light)"
                                      : "var(--fab-amber-light)",
                                color:
                                  message.senderRole === "admin"
                                    ? "var(--fab-magenta)"
                                    : message.senderRole === "maker"
                                      ? "var(--fab-teal)"
                                      : "var(--fab-amber)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              {message.senderRole}
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
                      ) : null}

                      {/* Message body — plain text, no bubble */}
                      <div
                        className="text-sm leading-relaxed"
                        style={{
                          color: "var(--fab-text-primary)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {message.moderationStatus === "flagged" ? (
                          <span
                            className="italic"
                            style={{
                              color: "var(--fab-text-dim)",
                              borderLeft: "3px solid rgba(239,68,68,0.4)",
                              paddingLeft: 10,
                            }}
                          >
                            This message was removed for violating content
                            policies.
                          </span>
                        ) : (
                          <>
                            {message.content && (
                              <div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed prose-strong:font-semibold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-inherit prose-a:text-inherit">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            )}

                            {messageFiles.length > 0 && (
                              <div
                                className={cn(message.content ? "mt-2" : "")}
                              >
                                <MessageAttachments files={messageFiles} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} aria-hidden="true" className="h-2" />
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Input area — sticky bottom                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="sticky bottom-0 z-10 px-4 pt-2 shrink-0 border-t-2 border-black bg-white"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {/* ── Pending attachments ───────────────────────────────────────── */}
        {(pendingAttachments.length > 0 || isUploading) && (
          <div className="mb-2 space-y-1.5">
            <PendingAttachmentStrip
              attachments={pendingAttachments}
              onRemove={removeAttachment}
            />
            {uploadingFiles
              .filter(
                (f) =>
                  f.status === "uploading" ||
                  f.status === "pending" ||
                  f.status === "error",
              )
              .map((uf, i) => {
                if (uf.status === "error") {
                  return (
                    <div
                      key={`err-${uf.file.name}-${uf.file.size}-${i}`}
                      className="flex items-center gap-1.5 px-0.5"
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider shrink-0"
                        style={{
                          color: "var(--fab-text-dim)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {uf.file.name}
                      </span>
                      <span
                        className="text-[9px] font-bold leading-tight truncate"
                        style={{
                          color: "var(--fab-magenta)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {uf.error || "Upload failed"}
                      </span>
                    </div>
                  );
                }

                const pct = Math.max(uf.progress, 2);
                return (
                  <div
                    key={`${uf.file.name}-${uf.file.size}-${i}`}
                    className="flex items-center gap-2 px-0.5"
                  >
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-200 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "var(--fab-teal)",
                        }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-bold tabular-nums shrink-0"
                      style={{ color: "var(--fab-teal)" }}
                    >
                      {uf.progress}%
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest truncate max-w-[100px]"
                      style={{
                        color: "var(--fab-text-dim)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {uf.file.name}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── Input container ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-2 py-1.5 border-2 border-black bg-white shadow-[4px_4px_0_0_#000] rounded-none transition-all focus-within:translate-x-0.5 focus-within:translate-y-0.5 focus-within:shadow-none">
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
            onUploadError={handleUploadError}
            onUploadingChange={setIsUploading}
            onUploadingFilesChange={handleUploadingFilesChange}
            onUploadComplete={(file) => {
              posthog.capture("chat_file_attached", {
                room_id: roomId,
                thread_id: threadId,
                file_type: file.fileType,
                file_size_bytes: file.fileSize,
              });
            }}
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
            className={cn(
              "flex items-center justify-center shrink-0 transition-transform border-2 border-black shadow-[2px_2px_0_0_#000]",
              "h-8 w-8 rounded-none",
              canSend
                ? "bg-[var(--fab-teal)] text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                : "bg-white text-[var(--fab-text-dim)] cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
