"use client";

import { createElement } from "react";
import { Button } from "@/components/ui/button";
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
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
} from "lucide-react";
import { useFileUpload } from "./use-file-upload";
import {
  getFileIcon,
  formatFileSize,
  isImageFile,
  resolveFileType,
} from "./utils";
import type { FileUploadProps, UploadedFile, UploadingFile } from "./types";

// ---------------------------------------------------------------------------
// Thumbnail sub-renders
// ---------------------------------------------------------------------------

function UploadingThumb({
  uf,
  size,
  getFilePreviewUrl,
}: {
  uf: UploadingFile;
  size: "sm" | "md";
  getFilePreviewUrl: (file: File) => string | undefined;
}) {
  const previewUrl = isImageFile(uf.file)
    ? getFilePreviewUrl(uf.file)
    : undefined;
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const iconSize = size === "sm" ? "h-5 w-5" : "h-8 w-8";

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

  const fileIcon = getFileIcon(resolveFileType(uf.file));
  return (
    <div className="shrink-0">
      {uf.status === "uploading" && (
        <Loader2 className={`${iconSize} animate-spin text-primary`} />
      )}
      {uf.status === "success" && (
        <CheckCircle2 className={`${iconSize} text-green-500`} />
      )}
      {uf.status === "error" && (
        <AlertCircle className={`${iconSize} text-destructive`} />
      )}
      {uf.status === "pending" &&
        createElement(fileIcon, {
          className: `${iconSize} text-muted-foreground`,
        })}
    </div>
  );
}

function UploadedThumb({ uf, size }: { uf: UploadedFile; size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const iconSize = size === "sm" ? "h-5 w-5" : "h-8 w-8";

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

  const fileIcon = getFileIcon(uf.fileType);
  return (
    <div className="shrink-0 flex items-center justify-center">
      {createElement(fileIcon, {
        className: `${iconSize} text-muted-foreground`,
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileUpload component
// ---------------------------------------------------------------------------

export function FileUpload({
  title,
  onAddFile,
  onUploadComplete,
  onUploadError,
  onFilesChange,
  onRemoveFile,
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
  const {
    uploadingFiles,
    uploadedFiles,
    isDragging,
    fileInputRef,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeUploadingFile,
    removeUploadedFile,
    clearAll,
    triggerFileSelect,
    getFilePreviewUrl,
  } = useFileUpload({
    maxFiles,
    maxFileSizeMB,
    disabled,
    autoUpload,
    value,
    onAddFile,
    onUploadComplete,
    onUploadError,
    onFilesChange,
    onRemoveFile,
    onUploadingChange,
  });

  // Shared hidden file input — rendered once, referenced by all variants.
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      onChange={handleFileInputChange}
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      className="sr-only"
      tabIndex={-1}
    />
  );

  // ---------------------------------------------------------------------------
  // Inline variant
  // ---------------------------------------------------------------------------

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center", className)}>
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
        {fileInput}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Minimal variant
  // ---------------------------------------------------------------------------

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
        {fileInput}
        {(uploadingFiles.length > 0 || uploadedFiles.length > 0) && (
          <div className="space-y-1">
            {uploadingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm p-2 rounded border"
              >
                <UploadingThumb
                  uf={file}
                  size="sm"
                  getFilePreviewUrl={getFilePreviewUrl}
                />
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
                <UploadedThumb uf={file} size="sm" />
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

  // ---------------------------------------------------------------------------
  // Compact variant
  // ---------------------------------------------------------------------------

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
          {fileInput}
        </div>

        {(uploadingFiles.length > 0 || uploadedFiles.length > 0) && (
          <div className="space-y-2">
            {uploadingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                <UploadingThumb
                  uf={file}
                  size="sm"
                  getFilePreviewUrl={getFilePreviewUrl}
                />
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
                <UploadedThumb uf={file} size="sm" />
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

  // ---------------------------------------------------------------------------
  // Default variant
  // ---------------------------------------------------------------------------

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
          {fileInput}
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
                  <UploadingThumb
                    uf={uploadingFile}
                    size="md"
                    getFilePreviewUrl={getFilePreviewUrl}
                  />
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
                  <UploadedThumb uf={uploadedFile} size="md" />
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
