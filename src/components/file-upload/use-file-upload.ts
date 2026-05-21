"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useConvex } from "convex/react";
import { useUploadFiles } from "@xixixao/uploadstuff/react";
import { api } from "@convex/_generated/api";
import type { UploadedFile, UploadingFile } from "./types";
import type { Id } from "@convex/_generated/dataModel";
import { resolveFileType } from "./utils";
import { toast } from "sonner";

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

  // ── UploadStuff headless hook ─────────────────────────────────────────────
  // Manages the Convex file-orchestration loop (short-lived URL,
  // chunking, binary stream) and provides upload progress callbacks.
  //
  // We intentionally omit onUploadBegin because uploadFile already
  // sets status to "uploading" by File reference *before* calling
  // startUpload. Matching by fileName would incorrectly mutate files
  // with duplicate names (e.g. revert "success" back to "uploading").
  //
  // onUploadProgress fires with an aggregate 0-100 value across all
  // concurrently uploading files. Since we serialize uploads (one file
  // at a time via the queue below), the aggregate IS the per-file
  // progress. The `p > f.progress` guard ensures monotonic updates
  // in case the library ever fires reordered events.
  const { startUpload } = useUploadFiles(generateUploadUrl, {
    onUploadProgress: (p: number) => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading" && p > f.progress
            ? { ...f, progress: p }
            : f,
        ),
      );
    },
    onUploadError: (e: unknown) => {
      // Capture the real error so we can surface it in the results.length===0
      // path below instead of a generic placeholder.
      const message = e instanceof Error ? e.message : String(e);
      lastUploadErrorRef.current = message;
      console.error("UploadStuff internal error:", e);
    },
  });

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

  // ── Moderation polling ──────────────────────────────────────────────────
  // After a file is uploaded, the backend schedules an async moderation check.
  // We poll getFileStatus for each uploaded file to detect when it gets flagged.
  // Track storage IDs that have already been checked to avoid redundant queries.
  const moderatedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const filesToCheck = uploadedFiles.filter(
      (f) => !moderatedIdsRef.current.has(f.storageId),
    );
    if (filesToCheck.length === 0) return;

    let cancelled = false;

    const checkFiles = async () => {
      const results = await Promise.all(
        filesToCheck.map(async (f) => {
          try {
            const status = await convex.query(api.files.getFileStatus, {
              storageId: f.storageId as Id<"_storage">,
            });
            return { storageId: f.storageId, status, file: f };
          } catch {
            return { storageId: f.storageId, status: null, file: f };
          }
        }),
      );

      if (cancelled) return;

      for (const { storageId, status } of results) {
        moderatedIdsRef.current.add(storageId);

        if (status?.status === "flagged") {
          const detail = status.moderationCategory
            ? ` (${status.moderationCategory})`
            : "";
          toast.error(
            `"${status.fileName}" was removed — it violates content policies.${detail}`,
          );

          // Remove the flagged file from the uploaded list.
          setUploadedFiles((prev) =>
            prev.filter((f) => f.storageId !== storageId),
          );

          // Notify parent via the error callback.
          onUploadError?.(
            new Error(
              `"${status.fileName}" was flagged by content moderation.`,
            ),
            new File([], status.fileName),
          );
        }
      }
    };

    checkFiles();

    return () => {
      cancelled = true;
    };
  }, [uploadedFiles, convex, onUploadError]);

  // ── Upload queue ──────────────────────────────────────────────────────────
  // uploadstuff v0.0.5 shares a single `fileProgress` ref across concurrent
  // `startUpload` calls and clears it in `finally`. Serializing uploads
  // (processing files one at a time) avoids the resulting data race and
  // ensures `onUploadProgress` always reflects the single in-flight file.
  const uploadQueueRef = useRef<File[]>([]);
  const processingRef = useRef(false);
  const lastUploadErrorRef = useRef<string | null>(null);

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
        // Uploadstuff handles the full Convex orchestration loop:
        //  1. Acquires short-lived upload URL
        //  2. Chunks/sends the binary stream (via XMLHttpRequest for
        //     native progress events)
        //  3. Returns the standard UploadFileResponse payload
        const results = await startUpload([file]);

        // startUpload swallows errors internally and returns [] on failure.
        if (results.length === 0) {
          const cause = lastUploadErrorRef.current;
          lastUploadErrorRef.current = null;
          const errorMessage = cause ?? "Upload failed — no response received";
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, status: "error" as const, error: errorMessage }
                : f,
            ),
          );
          onUploadError?.(new Error(errorMessage), file);

          // Auto-remove errored files after a delay so they don't
          // accumulate in the UI forever.
          setTimeout(() => {
            revokePreviewUrl(file);
            setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
          }, 5000);
          return;
        }

        lastUploadErrorRef.current = null; // clear on success

        const targetResult = results[0];

        // Runtime guard: uploadstuff types `response` as `unknown`.
        // Validate the shape before trusting the cast.
        const response = targetResult.response as Partial<{
          storageId: string;
        }> | null;
        const storageId = response?.storageId;
        if (typeof storageId !== "string") {
          throw new Error("Upload succeeded but response is missing storageId");
        }

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
          // Don't re-throw — let the moderation polling effect handle the
          // toast and removal. Mark this file so it gets polled immediately.
          if (
            urlError instanceof Error &&
            urlError.message.includes("content policies")
          ) {
            // Clear the upload progress and let the moderation watcher take over.
            setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
            revokePreviewUrl(file);
            // Still add to uploadedFiles so the moderation polling effect
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

        revokePreviewUrl(file);

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

        // Auto-remove errored files so they don't accumulate forever.
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

  const drainUploadQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (uploadQueueRef.current.length > 0) {
        const file = uploadQueueRef.current.shift()!;
        await uploadFile(file);
      }
    } finally {
      processingRef.current = false;
    }
  }, [uploadFile]);

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
        // Remove by File reference rather than by index, so a stale
        // `index` from a click handler doesn't target the wrong file
        // when auto-dismiss timeouts have already shifted the array.
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
      // Remove by storageId rather than by index — same stale-index
      // defence as removeUploadingFile above.
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
