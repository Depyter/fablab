"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  onUploadError?: (error: Error, file?: File) => void;
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
  hasUnmoderatedFiles: boolean;
}

export function useFileUpload({
  maxFiles = 10,
  maxFileSizeMB = 100,
  disabled = false,
  autoUpload = true,
  allowedTypes,
  value,
  onAddFile,
  onUploadComplete,
  onUploadError,
  onFilesChange,
  onRemoveFile,
  onUploadingChange,
  onUploadingFilesChange,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const isControlled = value !== undefined;

  const [internalUploadedFiles, setInternalUploadedFiles] =
    useState<UploadedFile[]>(EMPTY_UPLOADED_FILES);

  const uploadedFiles = isControlled ? value : internalUploadedFiles;

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrlMapRef = useRef(new Map<File, string>());
  const uploadQueueRef = useRef<File[]>([]);
  const processingRef = useRef(false);
  const toastedIdsRef = useRef(new Set<string>());
  const timeoutRefs = useRef(new Set<number>());

  const convex = useConvex();

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const trackUpload = useMutation(api.files.trackUpload);

  const { startUpload } = useUploadFiles(generateUploadUrl);

  const setUploadedFiles = useCallback(
    (updater: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
      const next =
        typeof updater === "function" ? updater(uploadedFiles) : updater;

      if (!isControlled) {
        setInternalUploadedFiles(next);
      }

      onFilesChange?.(next);
    },
    [isControlled, uploadedFiles, onFilesChange],
  );

  const createPreviewUrl = useCallback((file: File) => {
    const map = previewUrlMapRef.current;

    if (!map.has(file)) {
      map.set(file, URL.createObjectURL(file));
    }
  }, []);

  const revokePreviewUrl = useCallback((file: File) => {
    const map = previewUrlMapRef.current;
    const url = map.get(file);

    if (url) {
      URL.revokeObjectURL(url);
      map.delete(file);
    }
  }, []);

  const getFilePreviewUrl = useCallback((file: File) => {
    return previewUrlMapRef.current.get(file);
  }, []);

  useEffect(() => {
    const previewUrlMap = previewUrlMapRef.current;
    const timeoutSet = timeoutRefs.current;

    return () => {
      previewUrlMap.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      previewUrlMap.clear();

      timeoutSet.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

      timeoutSet.clear();
    };
  }, []);

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
              ? {
                  ...f,
                  status: "error",
                  error: error.message,
                }
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
              ? {
                  ...f,
                  status: "error",
                  error: error.message,
                }
              : f,
          ),
        );

        onUploadError?.(error, file);
        return;
      }

      setUploadingFiles((prev) =>
        prev.map((f) => (f.file === file ? { ...f, status: "uploading" } : f)),
      );

      try {
        const results = await startUpload([file], {
          contentType: mimeType,
          onUploadProgress: (progress: number) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file && progress > f.progress
                  ? { ...f, progress }
                  : f,
              ),
            );
          },
        });

        const result = results[0];

        if (!result) {
          throw new Error("Upload failed");
        }

        const storageId = result.response.storageId as Id<"_storage">;

        await trackUpload({
          originalName: file.name,
          type: mimeType,
          upload: storageId,
        });

        let permanentUrl: string | null = null;

        try {
          permanentUrl = await convex.query(api.files.getUrl, {
            storageId,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === CONTENT_POLICY_ERROR
          ) {
            revokePreviewUrl(file);

            setUploadingFiles((prev) => prev.filter((f) => f.file !== file));

            return;
          }

          throw error;
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
              ? {
                  ...f,
                  progress: 100,
                  status: "success",
                  storageId,
                }
              : f,
          ),
        );

        setUploadedFiles((prev) => [...prev, uploadedFile]);

        onAddFile?.(uploadedFile);
        onUploadComplete?.(uploadedFile);

        const timeoutId = window.setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));

          timeoutRefs.current.delete(timeoutId);
        }, 2000);

        timeoutRefs.current.add(timeoutId);
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("Upload failed");

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  status: "error",
                  error: normalizedError.message,
                }
              : f,
          ),
        );

        onUploadError?.(normalizedError, file);

        const timeoutId = window.setTimeout(() => {
          revokePreviewUrl(file);

          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));

          timeoutRefs.current.delete(timeoutId);
        }, 5000);

        timeoutRefs.current.add(timeoutId);
      }
    },
    [
      allowedTypes,
      convex,
      maxFileSizeMB,
      onAddFile,
      onUploadComplete,
      onUploadError,
      revokePreviewUrl,
      setUploadedFiles,
      startUpload,
      trackUpload,
    ],
  );

  const drainUploadQueue = useCallback(async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    try {
      while (uploadQueueRef.current.length > 0) {
        const nextFile = uploadQueueRef.current.shift();

        if (nextFile) {
          await uploadFile(nextFile);
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [uploadFile]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const fileArray = Array.from(files);

      const currentTotal = uploadingFiles.length + uploadedFiles.length;

      if (currentTotal + fileArray.length > maxFiles) {
        onUploadError?.(
          new Error(`You can only upload up to ${maxFiles} files`),
          fileArray[0],
        );

        return;
      }

      for (const file of fileArray) {
        createPreviewUrl(file);
      }

      const pendingFiles: UploadingFile[] = fileArray.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));

      setUploadingFiles((prev) => [...prev, ...pendingFiles]);

      if (autoUpload) {
        uploadQueueRef.current.push(...fileArray);
        void drainUploadQueue();
      }
    },
    [
      autoUpload,
      createPreviewUrl,
      drainUploadQueue,
      maxFiles,
      onUploadError,
      uploadedFiles.length,
      uploadingFiles.length,
    ],
  );

  const storageIdsForQuery = useMemo(() => {
    return uploadedFiles.map((f) => f.storageId as Id<"_storage">);
  }, [uploadedFiles]);

  const statuses = useQuery(
    api.files.getFileStatuses,
    storageIdsForQuery.length > 0 ? { storageIds: storageIdsForQuery } : "skip",
  );

  const moderatedFiles = useMemo(() => {
    if (!statuses || statuses.length === 0) {
      return uploadedFiles;
    }

    const statusMap = new Map(statuses.map((s) => [s.storageId as string, s]));

    let changed = false;

    const nextFiles: UploadedFile[] = [];

    for (const file of uploadedFiles) {
      const status = statusMap.get(file.storageId);

      if (status?.status === "flagged") {
        changed = true;
        continue;
      }

      if (status?.moderatedAt != null && file.moderationStatus == null) {
        changed = true;

        nextFiles.push({
          ...file,
          moderationStatus: "clean",
        });

        continue;
      }

      nextFiles.push(file);
    }

    return changed ? nextFiles : uploadedFiles;
  }, [statuses, uploadedFiles]);

  useEffect(() => {
    const isUploading = uploadingFiles.some(
      (f) => f.status === "pending" || f.status === "uploading",
    );

    onUploadingChange?.(isUploading);
    onUploadingFilesChange?.(uploadingFiles);
  }, [onUploadingChange, onUploadingFilesChange, uploadingFiles]);

  useEffect(() => {
    if (!statuses || statuses.length === 0) {
      return;
    }

    for (const entry of statuses) {
      if (toastedIdsRef.current.has(entry.storageId)) {
        continue;
      }

      if (entry.status === "flagged") {
        toastedIdsRef.current.add(entry.storageId);

        if (onUploadError) {
          onUploadError(
            new Error(`"${entry.fileName}" was flagged by content moderation.`),
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
  }, [onUploadError, statuses]);

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

      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      setIsDragging(false);

      if (!disabled) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles],
  );

  const removeUploadingFile = useCallback(
    (index: number) => {
      const target = uploadingFiles[index];

      if (!target) {
        return;
      }

      revokePreviewUrl(target.file);

      setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [revokePreviewUrl, uploadingFiles],
  );

  const removeUploadedFile = useCallback(
    (index: number) => {
      const target = moderatedFiles[index];

      if (!target) {
        return;
      }

      onRemoveFile?.(target);

      setUploadedFiles((prev) =>
        prev.filter((f) => f.storageId !== target.storageId),
      );
    },
    [moderatedFiles, onRemoveFile, setUploadedFiles],
  );

  const clearAll = useCallback(() => {
    for (const uploadingFile of uploadingFiles) {
      revokePreviewUrl(uploadingFile.file);
    }

    setUploadingFiles([]);
    setUploadedFiles([]);
  }, [revokePreviewUrl, setUploadedFiles, uploadingFiles]);

  const triggerFileSelect = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const hasUnmoderatedFiles = moderatedFiles.some(
    (f) => f.moderationStatus == null,
  );

  return {
    uploadingFiles,
    uploadedFiles: moderatedFiles,
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
    hasUnmoderatedFiles,
  };
}
