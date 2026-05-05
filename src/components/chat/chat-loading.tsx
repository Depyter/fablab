import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronDown, Hash, Paperclip, Send } from "lucide-react";
import { PresenceIndicatorSkeleton } from "./presence-indicator";

const messageSkeletonKeys = Array.from(
  { length: 21 },
  (_, index) => `chat-thread-skeleton-${index}`,
);

const sidebarRoomKeys = Array.from(
  { length: 4 },
  (_, index) => `chat-sidebar-room-skeleton-${index}`,
);

export function ChatMessageSkeleton({ index }: { index: number }) {
  // Simulate grouped vs first-in-group messages
  const isFirstInGroup = index % 3 === 0;
  const hasFiles = index % 5 === 2;

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 transition-colors",
        isFirstInGroup ? "mt-2" : "mt-0.5",
      )}
      style={{
        paddingTop: isFirstInGroup ? 4 : 0,
        paddingBottom: isFirstInGroup ? 1 : 0,
      }}
    >
      {/* Avatar column - fixed 34px width to match ChatInterface */}
      <div
        className="shrink-0 w-[34px]"
        style={{ marginTop: isFirstInGroup ? 2 : 0 }}
      >
        {isFirstInGroup ? (
          <Skeleton className="h-[34px] w-[34px] rounded-[8px]" />
        ) : null}
      </div>

      {/* Content column */}
      <div className="flex flex-col flex-1 min-w-0 max-w-2xl gap-1.5">
        {isFirstInGroup ? (
          <div className="flex items-baseline gap-2 mb-0.5">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Skeleton
            className={cn(
              "h-3 w-full max-w-[90%]",
              index % 2 === 0 ? "max-w-[80%]" : "max-w-[95%]",
            )}
          />
          {index % 4 === 0 && <Skeleton className="h-3 w-[60%]" />}

          {hasFiles && (
            <div className="mt-1 space-y-1">
              {/* FileAttachmentCard Skeleton */}
              <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-secondary/50 px-3 py-2.5 max-w-md">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <Skeleton className="h-3.5 w-[70%] rounded-full" />
                  <Skeleton className="h-2 w-[40%] rounded-full opacity-60" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatSidebarRoomsLoading() {
  return (
    <>
      {sidebarRoomKeys.map((key) => (
        <div key={key} className="flex flex-col">
          <div className="relative mx-1 flex flex-col gap-0.5 rounded-md px-3 py-2">
            <div className="flex w-full min-w-0 items-center gap-2">
              <div
                className="rounded p-0.5 -ml-1 shrink-0 transition-colors"
                style={{ color: "var(--fab-text-dim)" }}
              >
                <ChevronDown className="h-5 w-5" />
              </div>
              <Skeleton className="h-5 flex-1 rounded-md" />
              <div
                className="mr-1 h-2 w-2 shrink-0 rounded-full opacity-20"
                style={{ background: "var(--fab-magenta)" }}
              />
            </div>
          </div>
          <div className="relative flex flex-col pb-2">
            {["w-[80%]", "w-[65%]", "w-[72%]"].map((widthClass, index) => (
              <div
                key={`${key}-thread-${index}`}
                className="relative flex items-center gap-2 py-2 pl-7 pr-3"
              >
                <Hash
                  className="h-4 w-4 shrink-0 opacity-40"
                  style={{ color: "var(--fab-text-dim)" }}
                />
                <Skeleton className={cn("h-4 rounded-md", widthClass)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function ChatMessagesSkeletonList() {
  return (
    <div className="flex flex-col">
      {messageSkeletonKeys.map((key, index) => (
        <ChatMessageSkeleton key={key} index={index} />
      ))}
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 shrink-0"
      style={{
        background:
          "linear-gradient(to right, rgba(250,249,255,0.96), rgba(232,228,251,0.85))",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--fab-border-md)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <Skeleton className="-ml-2 h-9 w-9 shrink-0 rounded-md md:hidden" />

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
          <Hash
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--fab-text-primary)" }}
          />
        </div>
        <Skeleton className="h-5 w-36 max-w-[60%] rounded-md" />
      </div>

      <PresenceIndicatorSkeleton />
    </div>
  );
}

export function ChatInputSkeleton() {
  return (
    <div
      className="sticky bottom-0 z-10 px-4 pt-2 shrink-0"
      style={{
        background: "rgba(250,249,255,0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: "1px solid var(--fab-border)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
      }}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-[10px]"
        style={{
          background: "#ffffff",
          border: "1px solid var(--fab-border-md)",
          boxShadow: "0 1px 4px rgba(80,60,160,0.06)",
        }}
      >
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          aria-label="Attach files"
          disabled
          style={{ color: "var(--fab-text-dim)", cursor: "not-allowed" }}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <div className="flex-1 h-8 flex items-center">
          <span
            className="text-sm"
            style={{
              color: "var(--fab-text-dim)",
              fontFamily: "var(--font-body)",
            }}
          >
            Type a message…
          </span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px]"
          aria-label="Send message"
          disabled
          style={{
            background: "transparent",
            color: "var(--fab-text-dim)",
            cursor: "not-allowed",
          }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ChatThreadLoading() {
  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      style={{ background: "var(--fab-bg-main)" }}
    >
      <ChatHeaderSkeleton />

      {/* Grid background */}
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

      {/* Messages area */}
      <div
        className="relative z-[1] flex-1 overflow-y-auto px-4 py-4"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        <ChatMessagesSkeletonList />
      </div>

      <ChatInputSkeleton />
    </div>
  );
}
