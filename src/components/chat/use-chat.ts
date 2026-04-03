"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { UploadedFile } from "@/components/file-upload";
import { PendingAttachment } from "./types";

interface UseChatOptions {
  roomId: Id<"rooms">;
  threadId?: Id<"threads">;
}

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
    { room: roomId, threadId },
    { initialNumItems: 50 },
  );

  const sendMessageMutation = useMutation(api.chat.mutate.sendMessage);

  // Scroll handling
  const handleScroll = useCallback(() => {
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
  }, [status, loadMore]);

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
    bottomRef,
    handleScroll,
    handleSendMessage,
    handleKeyPress,
    handleFilesChange,
    removeAttachment,
  };
}
