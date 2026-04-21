"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { UploadedFile } from "@/components/file-upload";
import { PendingAttachment } from "./types";
import { toast } from "sonner";

interface UseChatOptions {
  roomId: Id<"rooms">;
  threadId?: Id<"threads">;
}

const MESSAGE_PAGE_SIZE = 50;

export function useChat({ roomId, threadId }: UseChatOptions) {
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
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const isTopVisibleRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  // Track the oldest loaded message — changes only when loadMore resolves
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
  }, [loadOlderMessages, messages.length]);

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
  }, [messages.length]);

  useEffect(() => {
    if (isTopVisibleRef.current) {
      loadOlderMessages();
    }
  }, [loadOlderMessages, messages.length, status]);

  useEffect(() => {
    if (threadId) {
      markReadMutation({ threadId }).catch(console.error);
    }
  }, [threadId, messages.length, markReadMutation]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // messages[messages.length - 1] is the oldest (query returns newest-first)
    const oldestId = messages[messages.length - 1]?._id ?? null;

    if (!initialScrollDoneRef.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
      initialScrollDoneRef.current = true;
      oldestMessageIdRef.current = oldestId;
      return;
    }

    // Older messages loaded: oldest message ID changed after loadMore resolved
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

    // New message arrived while loadMore is in-flight — don't restore scroll
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
            ? (attachments.map((a) => a.storageId) as Id<"_storage">[])
            : undefined,
        room: roomId,
        threadId,
      });
      // toast.success("Message sent");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
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

  const handleFilesChange = (files: UploadedFile[]) => {
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
    toast.error(error.message || "Failed to upload file");
  };

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

  return {
    input,
    setInput,
    messages: sortedMessages,
    status,
    isLoading,
    canSend,
    isUploading,
    setIsUploading,
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
    removeAttachment,
  };
}
