"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { UploadedFile, UploadingFile } from "./types";
import { resolveFileType } from "./utils";

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
  value = [],
  onAddFile,
  onUploadComplete,
  onUploadError,
  onFilesChange,
  onRemoveFile,
  onUploadingChange,
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

  // Stable refs so effects never need callbacks in their dependency arrays.
  const onUploadingChangeRef = useRef(onUploadingChange);
  onUploadingChangeRef.current = onUploadingChange;

  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;

  useEffect(() => {
    const isUploading = uploadingFiles.some(
      (f) => f.status === "uploading" || f.status === "pending",
    );
    onUploadingChangeRef.current?.(isUploading);
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

  const uploadFile = useCallback(
    async (file: File) => {
      const mimeType = resolveFileType(file);

      if (
        allowedTypes &&
        allowedTypes.length > 0 &&
        !allowedTypes.includes(mimeType)
      ) {
        const error = new Error(`File type ${mimeType} is not allowed`);
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
        const uploadUrl = await generateUploadUrl();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        const { storageId } = await result.json();

        await trackUpload({
          originalName: file.name,
          type: mimeType,
          upload: storageId,
        });

        const uploadedFile: UploadedFile = {
          storageId,
          fileName: file.name,
          fileType: mimeType,
          fileSize: file.size,
          uploadedAt: new Date(),
          url: previewUrlMapRef.current.get(file),
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
      }
    },
    [
      generateUploadUrl,
      trackUpload,
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
        fileArray.forEach((file) => uploadFile(file));
      }
    },
    [
      uploadingFiles.length,
      uploadedFiles.length,
      maxFiles,
      autoUpload,
      uploadFile,
      getFilePreviewUrl,
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

  const removeUploadingFile = useCallback((index: number) => {
    setUploadingFiles((prev) => {
      const uf = prev[index];
      if (uf) {
        const url = previewUrlMapRef.current.get(uf.file);
        if (url) {
          URL.revokeObjectURL(url);
          previewUrlMapRef.current.delete(uf.file);
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

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
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setUploadingFiles((prev) => {
      prev.forEach((uf) => {
        const url = previewUrlMapRef.current.get(uf.file);
        if (url) {
          URL.revokeObjectURL(url);
          previewUrlMapRef.current.delete(uf.file);
        }
      });
      return [];
    });
    setUploadedFiles([]);
  }, []);

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
