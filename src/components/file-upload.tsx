"use client";

import { useState, useRef, useCallback } from "react";
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
}

interface FileUploadProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: Error, file: File) => void;
  onFilesChange?: (files: UploadedFile[]) => void;
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
  onUploadComplete,
  onUploadError,
  onFilesChange,
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

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

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
        setUploadedFiles((prev) => {
          const updated = [...prev, uploadedFile];
          onFilesChange?.(updated);
          return updated;
        });

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
    [
      generateUploadUrl,
      maxFileSizeMB,
      onUploadComplete,
      onUploadError,
      onFilesChange,
    ],
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
        status: autoUpload ? "pending" : "pending",
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
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesChange?.(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setUploadingFiles([]);
    setUploadedFiles([]);
    onFilesChange?.([]);
  };

  const triggerFileSelect = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Render variants
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
          Upload Files
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
                {file.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                )}
                {file.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
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
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
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
            {uploadingFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.file.type);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                >
                  <div className="shrink-0">
                    {file.status === "uploading" && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    {file.status === "success" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
              );
            })}
            {uploadedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.fileType);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-muted/50"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </p>
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
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
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
              {uploadingFiles.map((uploadingFile, index) => {
                const FileIcon = getFileIcon(uploadingFile.file.type);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="shrink-0">
                      {uploadingFile.status === "uploading" && (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      )}
                      {uploadingFile.status === "success" && (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      )}
                      {uploadingFile.status === "error" && (
                        <AlertCircle className="h-8 w-8 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm font-medium truncate">
                          {uploadingFile.file.name}
                        </p>
                      </div>
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
                );
              })}

              {uploadedFiles.map((uploadedFile, index) => {
                const FileIcon = getFileIcon(uploadedFile.fileType);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                  >
                    <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm font-medium truncate">
                          {uploadedFile.fileName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadedFile.fileSize)}
                      </p>
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
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
