"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { useUploadFiles } from "@/lib/use-upload-files";
import { api } from "@convex/_generated/api";
import type { UploadedFile, UploadingFile } from "./types";
import type { Id } from "@convex/_generated/dataModel";
import { resolveFileType } from "./utils";
import { toast } from "sonner";
import { CONTENT_POLICY_ERROR } from "@convex/constants";

const EMPTY_UPLOADED_FILES: UploadedFile[] = [];

export interface UseFileUploadOptions {
  maxFiles?: number;
  maxFileSizeMB?: number;
  disabled?: boolean;
  autoUpload?: boolean;
  allowedTypes?: string[];
  value?: UploadedFile[];
  onAddFile?: (file: UploadedFile) => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: Error, file: File) => void;
  onFilesChange?: (files: UploadedFile[]) => void;
  onRemoveFile?: (file: UploadedFile) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  onUploadingFilesChange?: (files: UploadingFile[]) => void;
}

export interface UseFileUploadReturn {
  uploadingFiles: UploadingFile[];
  uploadedFiles: UploadedFile[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFiles: (files: FileList | null) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  removeUploadingFile: (index: number) => void;
  removeUploadedFile: (index: number) => void;
  clearAll: () => void;
  triggerFileSelect: () => void;
  getFilePreviewUrl: (file: File) => string | undefined;
}

export function useFileUpload({
  maxFiles = 10,
  maxFileSizeMB = 100,
  disabled = false,
  autoUpload = true,
  allowedTypes,
  value = EMPTY_UPLOADED_FILES,
  onAddFile,
  onUploadComplete,
  onUploadError,
  onFilesChange,
  onRemoveFile,
  onUploadingChange,
  onUploadingFilesChange,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(value);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map from File object → object URL (for image/video previews of in-progress
  // uploads). Kept in a ref so revocation doesn't cause re-renders.
  const previewUrlMapRef = useRef<Map<File, string>>(new Map());

  const getFilePreviewUrl = useCallback((file: File): string | undefined => {
    if (!previewUrlMapRef.current.has(file)) {
      previewUrlMapRef.current.set(file, URL.createObjectURL(file));
    }
    return previewUrlMapRef.current.get(file);
  }, []);

  /** Revoke and clean up the blob URL for a single file. Idempotent. */
  const revokePreviewUrl = useCallback((file: File) => {
    const url = previewUrlMapRef.current.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      previewUrlMapRef.current.delete(file);
    }
  }, []);

  // Revoke all object URLs on unmount.
  useEffect(() => {
    const map = previewUrlMapRef.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
      map.clear();
    };
  }, []);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const trackUpload = useMutation(api.files.trackUpload);
  const convex = useConvex();

  // ── UploadStuff headless hook (local implementation) ────────────────────
  // Replaces @xixixao/uploadstuff/react. Uploads are already serialized
  // by drainUploadQueue below; the hook also generates one URL per file
  // internally (avoids single-use-URL sharing bugs).
  const { startUpload } = useUploadFiles(generateUploadUrl);

  // Stable refs so effects never need callbacks in their dependency arrays.
  const onUploadingChangeRef = useRef(onUploadingChange);
  const onFilesChangeRef = useRef(onFilesChange);
  const onUploadingFilesChangeRef = useRef(onUploadingFilesChange);

  useEffect(() => {
    onUploadingChangeRef.current = onUploadingChange;
  }, [onUploadingChange]);

  useEffect(() => {
    onFilesChangeRef.current = onFilesChange;
  }, [onFilesChange]);

  useEffect(() => {
    onUploadingFilesChangeRef.current = onUploadingFilesChange;
  }, [onUploadingFilesChange]);

  useEffect(() => {
    const isUploading = uploadingFiles.some(
      (f) => f.status === "uploading" || f.status === "pending",
    );
    onUploadingChangeRef.current?.(isUploading);
  }, [uploadingFiles]);

  useEffect(() => {
    onUploadingFilesChangeRef.current?.(uploadingFiles);
  }, [uploadingFiles]);

  // Skip the first render so we don't call onFilesChange with the initial
  // value and accidentally mark form fields dirty on mount.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onFilesChangeRef.current?.(uploadedFiles);
  }, [uploadedFiles]);

  // ── Moderation watcher (reactive subscription) ──────────────────────────
  // After a file is uploaded the backend schedules an async moderation check
  // via ctx.scheduler.runAfter(0, …). We use a reactive `useQuery` — when
  // moderation patches the file status to "flagged" in the database, the
  // query re-runs and we detect the change without polling.
  //
  // We subscribe to ALL uploaded file IDs (not just unchecked ones) so the
  // query stays reactive for every file. `toastedIdsRef` prevents duplicate
  // toasts when the same file transitions to "flagged" across re-renders.

  const storageIdsForQuery = uploadedFiles.map(
    (f) => f.storageId as Id<"_storage">,
  );

  const statuses = useQuery(
    api.files.getFileStatuses,
    storageIdsForQuery.length > 0 ? { storageIds: storageIdsForQuery } : "skip",
  );

  const toastedIdsRef = useRef<Set<string>>(new Set());

  // When the subscription fires, check for newly-flagged files and show toasts.
  useEffect(() => {
    if (!statuses || statuses.length === 0) return;

    for (const entry of statuses) {
      if (toastedIdsRef.current.has(entry.storageId)) continue;

      if (entry.status === "flagged") {
        toastedIdsRef.current.add(entry.storageId);

        // Remove the flagged file from the uploaded list.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUploadedFiles((prev) =>
          prev.filter((f) => f.storageId !== entry.storageId),
        );

        // Notify the parent so it can show its own context-appropriate
        // toast (e.g. chat shows a chat-specific message).  Fall back to
        // a default toast if the parent doesn't provide a handler.
        if (onUploadError) {
          onUploadError(
            new Error(`"${entry.fileName}" was flagged by content moderation.`),
            new File([], entry.fileName),
          );
        } else {
          const detail = entry.moderationCategory
            ? ` (${entry.moderationCategory})`
            : "";
          toast.error(
            `"${entry.fileName}" was removed — it violates content policies.${detail}`,
          );
        }
      }
    }
  }, [statuses, onUploadError]);

  // ── Upload queue ──────────────────────────────────────────────────────────
  // uploadstuff v0.0.5 shares a single `fileProgress` ref across concurrent
  // `startUpload` calls and clears it in `finally`. Serializing uploads
  // (processing files one at a time) avoids the resulting data race and
  // ensures `onUploadProgress` always reflects the single in-flight file.
  const uploadQueueRef = useRef<File[]>([]);
  const processingRef = useRef(false);

  const uploadFile = useCallback(
    async (file: File) => {
      const mimeType = resolveFileType(file);

      if (
        allowedTypes &&
        allowedTypes.length > 0 &&
        !allowedTypes.includes(mimeType)
      ) {
        const error = new Error(`File type ${mimeType} is not allowed`);
        revokePreviewUrl(file);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "error" as const, error: error.message }
              : f,
          ),
        );
        onUploadError?.(error, file);
        return;
      }

      if (file.size > maxFileSizeMB * 1024 * 1024) {
        const error = new Error(`File size exceeds ${maxFileSizeMB}MB`);
        revokePreviewUrl(file);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "error" as const, error: error.message }
              : f,
          ),
        );
        onUploadError?.(error, file);
        return;
      }

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: "uploading" as const } : f,
        ),
      );

      try {
        // Upload the file via XMLHttpRequest for native progress events.
        // Each file gets its own short-lived Convex upload URL.
        const results = await startUpload([file], {
          contentType: mimeType,
          onUploadProgress: (p: number) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file && p > f.progress ? { ...f, progress: p } : f,
              ),
            );
          },
        });

        const targetResult = results[0];
        const { storageId } = targetResult.response;

        // Persist metadata in our Convex schema.
        await trackUpload({
          originalName: file.name,
          type: mimeType,
          upload: storageId as Id<"_storage">,
        });

        // Fetch the permanent server-hosted URL, then revoke the blob URL.
        // getUrl may throw ConvexError if the file was already flagged by
        // the async moderation check — treat that as a normal moderation
        // outcome rather than a raw error.
        let permanentUrl: string | null = null;
        try {
          permanentUrl = await convex.query(api.files.getUrl, {
            storageId: storageId as Id<"_storage">,
          });
        } catch (urlError) {
          // Moderation flagged the file before we could fetch the URL.
          // Don't re-throw — let the moderation watcher handle the
          // toast and removal.
          if (
            urlError instanceof Error &&
            urlError.message === CONTENT_POLICY_ERROR
          ) {
            // Clear the upload progress and let the moderation watcher take over.
            setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
            revokePreviewUrl(file);
            // Still add to uploadedFiles so the moderation watcher
            // can find it and show the proper toast.
            setUploadedFiles((prev) => [
              ...prev,
              {
                storageId,
                fileName: file.name,
                fileType: mimeType,
                fileSize: file.size,
                uploadedAt: new Date(),
              },
            ]);
            return;
          }
          throw urlError;
        }

        const blobUrl = previewUrlMapRef.current.get(file);
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          previewUrlMapRef.current.delete(file);
        }

        const uploadedFile: UploadedFile = {
          storageId,
          fileName: file.name,
          fileType: mimeType,
          fileSize: file.size,
          uploadedAt: new Date(),
          url: permanentUrl ?? undefined,
        };

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, progress: 100, status: "success" as const, storageId }
              : f,
          ),
        );

        setUploadedFiles((prev) => [...prev, uploadedFile]);
        await Promise.resolve(onAddFile?.(uploadedFile));
        await Promise.resolve(onUploadComplete?.(uploadedFile));

        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
        }, 2000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "error" as const, error: errorMessage }
              : f,
          ),
        );

        onUploadError?.(
          error instanceof Error ? error : new Error("Upload failed"),
          file,
        );

        // Auto-remove errored files and revoke their preview URLs.
        setTimeout(() => {
          revokePreviewUrl(file);
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
        }, 5000);
      }
    },
    [
      startUpload,
      trackUpload,
      convex,
      maxFileSizeMB,
      allowedTypes,
      onAddFile,
      onUploadComplete,
      onUploadError,
    ],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      const totalFiles =
        uploadingFiles.length + uploadedFiles.length + fileArray.length;
      if (totalFiles > maxFiles) {
        onUploadError?.(
          new Error(`You can only upload up to ${maxFiles} files at a time`),
          fileArray[0],
        );
        return;
      }

      // Eagerly create preview URLs so they are available when onUploadComplete
      // fires (the lazy path via thumbnail rendering may not have run yet).
      fileArray.forEach((file) => getFilePreviewUrl(file));

      const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      if (autoUpload) {
        uploadQueueRef.current.push(...fileArray);
        drainUploadQueue();
      }
    },
    [
      uploadingFiles.length,
      uploadedFiles.length,
      maxFiles,
      autoUpload,
      uploadFile,
      getFilePreviewUrl,
      onUploadError,
    ],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!disabled) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const removeUploadingFile = useCallback(
    (index: number) => {
      setUploadingFiles((prev) => {
        const uf = prev[index];
        if (!uf) return prev;
        revokePreviewUrl(uf.file);
        // Remove by File reference, not by index — avoids the class of
        // bugs where an auto-dismiss timeout shifts the array between
        // the render that captured `index` and the actual state update.
        return prev.filter((f) => f.file !== uf.file);
      });
    },
    [revokePreviewUrl],
  );

  const previousUploadedFilesRef = useRef<UploadedFile[]>(value);
  // Keep track of files being deleted to prevent double-invocation of onRemoveFile
  const deletingFileIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const previousFiles = previousUploadedFilesRef.current;
    const currentFiles = uploadedFiles;

    const removedFiles = previousFiles.filter(
      (prevFile) =>
        !currentFiles.some(
          (currFile) => currFile.storageId === prevFile.storageId,
        ),
    );

    if (removedFiles.length > 0 && onRemoveFile) {
      void (async () => {
        for (const file of removedFiles) {
          if (deletingFileIdsRef.current.has(file.storageId)) {
            continue;
          }

          deletingFileIdsRef.current.add(file.storageId);
          await Promise.resolve(onRemoveFile(file));
        }
      })().catch((error) => {
        console.error("Failed to remove uploaded file:", error);
      });
    }

    previousUploadedFilesRef.current = currentFiles;
  }, [uploadedFiles, onRemoveFile]);

  const removeUploadedFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const uf = prev[index];
      if (!uf) return prev;
      return prev.filter((f) => f.storageId !== uf.storageId);
    });
  }, []);

  const clearAll = useCallback(() => {
    setUploadingFiles((prev) => {
      prev.forEach((uf) => revokePreviewUrl(uf.file));
      return [];
    });
    setUploadedFiles([]);
  }, [revokePreviewUrl]);

  const triggerFileSelect = useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  const drainUploadQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (uploadQueueRef.current.length > 0) {
        const next = uploadQueueRef.current.shift();
        if (next) await uploadFile(next);
      }
    } finally {
      processingRef.current = false;
    }
  }, [uploadFile]);

  // whenever new files are enqueued, kick off the drain
  useEffect(() => {
    drainUploadQueue();
  }, [drainUploadQueue]);

  return {
    uploadingFiles,
    uploadedFiles,
    isDragging,
    fileInputRef,
    handleFiles,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeUploadingFile,
    removeUploadedFile,
    clearAll,
    triggerFileSelect,
    getFilePreviewUrl,
  };
}
