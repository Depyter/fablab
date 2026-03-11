"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
} from "lucide-react";

// Types
export interface UploadedFile {
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  url?: string;
}

interface FileUploadProps {
  title: string;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: Error, file: File) => void;
  onFilesChange?: (files: UploadedFile[]) => void;
  /** Called whenever the in-progress upload state changes. `true` means at least one upload is still pending/uploading. */
  onUploadingChange?: (isUploading: boolean) => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
  variant?: "default" | "compact" | "minimal" | "inline";
  showPreview?: boolean;
  autoUpload?: boolean;
  value?: UploadedFile[];
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  storageId?: string;
}

// Helper function to get file icon
const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  if (type.startsWith("audio/")) return Music;
  if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("7z") ||
    type.includes("tar")
  )
    return Archive;
  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text")
  )
    return FileText;
  return File;
};

// Helper function to format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export function FileUpload({
  title,
  onUploadComplete,
  onUploadError,
  onFilesChange,
  onUploadingChange,
  maxFiles = 10,
  maxFileSizeMB = 100,
  accept,
  disabled = false,
  className,
  multiple = true,
  variant = "default",
  autoUpload = true,
  value = [],
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(value);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map from File object → object URL (for image previews of in-progress uploads).
  // Kept in a ref so we can revoke on removal / unmount without causing re-renders.
  const previewUrlMapRef = useRef<Map<File, string>>(new Map());

  // Returns (and lazily creates) an object URL for the given image File.
  const getFilePreviewUrl = useCallback((file: File): string | undefined => {
    if (!file.type.startsWith("image/")) return undefined;
    if (!previewUrlMapRef.current.has(file)) {
      previewUrlMapRef.current.set(file, URL.createObjectURL(file));
    }
    return previewUrlMapRef.current.get(file);
  }, []);

  // Revoke all object URLs when the component unmounts.
  useEffect(() => {
    const map = previewUrlMapRef.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
      map.clear();
    };
  }, []);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Stable ref for onUploadingChange — same pattern as onFilesChange.
  const onUploadingChangeRef = useRef(onUploadingChange);
  onUploadingChangeRef.current = onUploadingChange;

  // Notify parent whenever the set of in-progress uploads changes.
  useEffect(() => {
    const isUploading = uploadingFiles.some(
      (f) => f.status === "uploading" || f.status === "pending",
    );
    onUploadingChangeRef.current?.(isUploading);
  }, [uploadingFiles]);

  // Keep a stable ref to the latest onFilesChange so the effect below never
  // needs it in its dependency array (avoids re-running on every render when
  // the parent passes an inline arrow function).
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;

  // Skip the very first render so we don't call onFilesChange with the initial
  // empty value and accidentally mark form fields as dirty/touched on mount.
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
      // Check file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        const error = new Error(`File size exceeds ${maxFileSizeMB}MB`);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  status: "error" as const,
                  error: error.message,
                }
              : f,
          ),
        );
        onUploadError?.(error, file);
        return;
      }

      // Update to uploading status
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: "uploading" as const } : f,
        ),
      );

      try {
        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        const { storageId } = await result.json();

        const uploadedFile: UploadedFile = {
          storageId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date(),
          // Carry over the object URL we already created for the upload preview.
          url: previewUrlMapRef.current.get(file),
        };

        // Update status to success
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  progress: 100,
                  status: "success" as const,
                  storageId,
                }
              : f,
          ),
        );

        // Add to uploaded files
        setUploadedFiles((prev) => [...prev, uploadedFile]);

        onUploadComplete?.(uploadedFile);

        // Remove from uploading list after a delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
        }, 2000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  status: "error" as const,
                  error: errorMessage,
                }
              : f,
          ),
        );

        onUploadError?.(
          error instanceof Error ? error : new Error("Upload failed"),
          file,
        );
      }
    },
    [generateUploadUrl, maxFileSizeMB, onUploadComplete, onUploadError],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      // Check max files limit
      const totalFiles =
        uploadingFiles.length + uploadedFiles.length + fileArray.length;
      if (totalFiles > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files at a time`);
        return;
      }

      // Add files to uploading list
      const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Auto upload if enabled
      if (autoUpload) {
        fileArray.forEach((file) => {
          uploadFile(file);
        });
      }
    },
    [
      uploadingFiles.length,
      uploadedFiles.length,
      maxFiles,
      autoUpload,
      uploadFile,
    ],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeUploadingFile = (index: number) => {
    const uf = uploadingFiles[index];
    if (uf) {
      const url = previewUrlMapRef.current.get(uf.file);
      if (url) {
        URL.revokeObjectURL(url);
        previewUrlMapRef.current.delete(uf.file);
      }
    }
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    // Revoke all in-progress preview URLs
    uploadingFiles.forEach((uf) => {
      const url = previewUrlMapRef.current.get(uf.file);
      if (url) {
        URL.revokeObjectURL(url);
        previewUrlMapRef.current.delete(uf.file);
      }
    });
    setUploadingFiles([]);
    setUploadedFiles([]);
    // onFilesChange is notified via the uploadedFiles useEffect
  };

  const triggerFileSelect = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // ---------------------------------------------------------------------------
  // Shared sub-renders
  // ---------------------------------------------------------------------------

  /** Thumbnail for an in-progress File upload (image or icon). */
  const renderUploadingThumb = (
    uf: UploadingFile,
    size: "sm" | "md" = "md",
  ) => {
    const previewUrl = uf.file.type.startsWith("image/")
      ? getFilePreviewUrl(uf.file)
      : undefined;
    const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";

    if (previewUrl) {
      return (
        <div
          className={`${dim} rounded-md overflow-hidden bg-muted shrink-0 relative`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={uf.file.name}
            className="w-full h-full object-cover"
          />
          {uf.status === "uploading" && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="h-3 w-3 animate-spin text-white" />
            </div>
          )}
          {uf.status === "error" && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <AlertCircle className="h-3 w-3 text-destructive" />
            </div>
          )}
        </div>
      );
    }

    const FileIcon = getFileIcon(uf.file.type);
    return (
      <div className="shrink-0">
        {uf.status === "uploading" && (
          <Loader2
            className={`${size === "sm" ? "h-5 w-5" : "h-8 w-8"} animate-spin text-primary`}
          />
        )}
        {uf.status === "success" && (
          <CheckCircle2
            className={`${size === "sm" ? "h-5 w-5" : "h-8 w-8"} text-green-500`}
          />
        )}
        {uf.status === "error" && (
          <AlertCircle
            className={`${size === "sm" ? "h-5 w-5" : "h-8 w-8"} text-destructive`}
          />
        )}
        {uf.status === "pending" && (
          <FileIcon
            className={`${size === "sm" ? "h-5 w-5" : "h-8 w-8"} text-muted-foreground`}
          />
        )}
      </div>
    );
  };

  /** Thumbnail for a completed / pre-existing UploadedFile (image or icon). */
  const renderUploadedThumb = (uf: UploadedFile, size: "sm" | "md" = "md") => {
    const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";

    if (uf.fileType.startsWith("image/") && uf.url) {
      return (
        <div className={`${dim} rounded-md overflow-hidden bg-muted shrink-0`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uf.url}
            alt={uf.fileName}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    const FileIcon = getFileIcon(uf.fileType);
    return (
      <div className="shrink-0 flex items-center justify-center">
        <FileIcon
          className={`${size === "sm" ? "h-5 w-5" : "h-8 w-8"} text-muted-foreground`}
        />
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={triggerFileSelect}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
        />
        {uploadingFiles.length > 0 && (
          <div className="flex items-center gap-2">
            {uploadingFiles.map((file, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {file.status === "uploading" && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {file.status === "success" && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                )}
                <span className="max-w-25 truncate">{file.file.name}</span>
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeUploadingFile(index)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileSelect}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          <p className="font-bold text-lg">{title}</p>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
        />
        {(uploadingFiles.length > 0 || uploadedFiles.length > 0) && (
          <div className="space-y-1">
            {uploadingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm p-2 rounded border"
              >
                {renderUploadingThumb(file, "sm")}
                <span className="flex-1 truncate">{file.file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeUploadingFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm p-2 rounded border bg-muted/50"
              >
                {renderUploadedThumb(file, "sm")}
                <span className="flex-1 truncate">{file.fileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeUploadedFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragging && !disabled
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {isDragging ? "Drop here" : "Upload files"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {(uploadingFiles.length > 0 || uploadedFiles.length > 0) && (
          <div className="space-y-2">
            {uploadingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                {renderUploadingThumb(file, "sm")}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.file.name}
                  </p>
                  {file.status === "error" && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(index)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg border bg-muted/50"
              >
                {renderUploadedThumb(file, "sm")}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.fileName}
                  </p>
                  {file.fileSize > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadedFile(index)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="font-bold text-lg">{title}</CardTitle>
        <CardDescription>
          Drag and drop or click to upload. Max {maxFileSizeMB}MB per file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragging && !disabled
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragging
                  ? "Drop files here"
                  : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                {accept ? `Accepted: ${accept}` : "Any file type"} • Max{" "}
                {maxFileSizeMB}MB per file
              </p>
              {maxFiles > 1 && (
                <p className="text-xs text-muted-foreground">
                  Up to {maxFiles} files
                </p>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {(uploadingFiles.length > 0 || uploadedFiles.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Files ({uploadingFiles.length + uploadedFiles.length})
              </h3>
              {uploadedFiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {uploadingFiles.map((uploadingFile, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {renderUploadingThumb(uploadingFile, "md")}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                    {uploadingFile.status === "error" && (
                      <p className="text-xs text-destructive mt-1">
                        {uploadingFile.error}
                      </p>
                    )}
                    {uploadingFile.status === "success" && (
                      <p className="text-xs text-green-600 mt-1">
                        Upload complete
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(index)}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {uploadedFiles.map((uploadedFile, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                >
                  {renderUploadedThumb(uploadedFile, "md")}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.fileName}
                    </p>
                    {uploadedFile.fileSize > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadedFile.fileSize)}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadedFile(index)}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
