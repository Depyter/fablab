import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CONTENT_POLICY_ERROR } from "@convex/constants";
import { usePostHog } from "@posthog/react";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { UploadedFile, UploadingFile } from "@/components/file-upload";
import { getRateLimitErrorMessage } from "@/lib/rate-limit";
import type { PendingAttachment } from "./types";

interface UseChatOptions {
  roomId: Id<"rooms">;
  threadId: Id<"threads">;
}

const MESSAGE_PAGE_SIZE = 50;

export function useChat({ roomId, threadId }: UseChatOptions) {
  const posthog = usePostHog();
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<PendingAttachment>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<UploadingFile>>(
    [],
  );

  const [fileUploadKey, setFileUploadKey] = useState(0);
  const [fileUploadInitialFiles, setFileUploadInitialFiles] = useState<
    Array<UploadedFile>
  >([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const isTopVisibleRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const oldestMessageIdRef = useRef<string | null>(null);

  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chat.query.getRoomMessages,
    { room: roomId, threadId },
    { initialNumItems: MESSAGE_PAGE_SIZE },
  );

  const sendMessageMutation = useMutation(api.chat.mutate.sendMessage);
  const markReadMutation = useMutation(api.chat.mutate.markThreadRead);
  const newestMessageId = messages[0]?._id;

  const loadOlderMessages = useCallback(() => {
    const container = scrollContainerRef.current;
    if (
      !container ||
      status !== "CanLoadMore" ||
      isLoadingMoreRef.current ||
      !initialScrollDoneRef.current
    ) {
      return;
    }

    prevScrollHeightRef.current = container.scrollHeight;
    isLoadingMoreRef.current = true;
    loadMore(MESSAGE_PAGE_SIZE);
  }, [loadMore, status]);

  // 1. Top Sentinel Observer — Added actual node dependencies to handle mount timing safely
  useEffect(() => {
    const container = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    if (!container || !topSentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isTopVisibleRef.current = entry?.isIntersecting ?? false;

        if (entry?.isIntersecting) {
          loadOlderMessages();
        }
      },
      { root: container },
    );

    observer.observe(topSentinel);
    return () => observer.disconnect();
  }, [loadOlderMessages]);

  // 2. Bottom Sentinel Observer — Added target refs to track intersection actively on node changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    const bottomSentinel = bottomRef.current;
    if (!container || !bottomSentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearBottomRef.current = entry?.isIntersecting ?? false;
      },
      { root: container },
    );

    observer.observe(bottomSentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status === "LoadingFirstPage" || !newestMessageId) return;

    markReadMutation({ threadId }).catch(console.error);
  }, [threadId, newestMessageId, status, markReadMutation]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const oldestId = messages[messages.length - 1]?._id ?? null;

    if (!initialScrollDoneRef.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
      initialScrollDoneRef.current = true;
      oldestMessageIdRef.current = oldestId;
      return;
    }

    if (isLoadingMoreRef.current && oldestId !== oldestMessageIdRef.current) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop += newScrollHeight - prevScrollHeightRef.current;
      isLoadingMoreRef.current = false;
      oldestMessageIdRef.current = oldestId;
      return;
    }

    if (isLoadingMoreRef.current && status === "Exhausted") {
      isLoadingMoreRef.current = false;
      oldestMessageIdRef.current = oldestId;
    }

    if (isLoadingMoreRef.current) return;

    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

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
      await sendMessageMutation({
        content: content.trim() || "",
        files:
          attachments.length > 0
            ? (attachments.map((a) => a.storageId) as Array<Id<"_storage">>)
            : undefined,
        room: roomId,
        threadId,
      });
      posthog.capture("chat_message_sent", {
        room_id: roomId,
        thread_id: threadId,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length,
        message_length: content.trim().length,
      });
    } catch (error) {
      console.error("Failed to send message:", error);

      const rateLimitMsg = getRateLimitErrorMessage(error);
      if (rateLimitMsg) {
        toast.error(rateLimitMsg);
        setInput(content);
        return;
      }

      const rawMessage =
        error instanceof Error ? error.message : "Failed to send message";
      const isContentPolicy =
        rawMessage.includes(CONTENT_POLICY_ERROR) ||
        rawMessage.includes("flagged by content moderation");
      toast.error(
        isContentPolicy
          ? "Your message couldn't be sent because it may contain inappropriate content."
          : "Failed to send message. Please try again.",
      );
      setInput(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFilesChange = (files: Array<UploadedFile>) => {
    setPendingAttachments(
      files.map((f) => ({
        storageId: f.storageId,
        fileName: f.fileName,
        fileType: f.fileType,
        previewUrl: f.url ?? "",
      })),
    );
  };

  const handleUploadError = (error: Error) => {
    console.error("Chat upload error:", error);

    const isContentPolicy =
      error.message?.includes(CONTENT_POLICY_ERROR) ||
      error.message?.includes("flagged by content moderation");
    toast.error(
      isContentPolicy
        ? "A file you attached was removed because it may contain inappropriate content."
        : error.message || "Failed to upload file",
    );
  };

  const removeAttachment = (index: number) => {
    const remaining = pendingAttachments.filter((_, i) => i !== index);
    const remainingAsUploadedFiles: Array<UploadedFile> = remaining.map(
      (a) => ({
        storageId: a.storageId,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: 0,
        uploadedAt: new Date(),
        url: a.previewUrl,
      }),
    );

    setPendingAttachments(remaining);
    setFileUploadInitialFiles(remainingAsUploadedFiles);
    setFileUploadKey((k) => k + 1);
  };

  const isLoading = status === "LoadingFirstPage";
  const canSend =
    !isLoading &&
    !isUploading &&
    (!!input.trim() || pendingAttachments.length > 0);
  const sortedMessages = [...messages].reverse();

  const handleUploadingFilesChange = useCallback(
    (files: Array<UploadingFile>) => {
      setUploadingFiles(files);
    },
    [],
  );

  return {
    input,
    setInput,
    messages: sortedMessages,
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
  };
}
