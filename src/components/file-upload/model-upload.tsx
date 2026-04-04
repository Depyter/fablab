"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2, AlertCircle, Box } from "lucide-react";
import { useFileUpload } from "./use-file-upload";
import { formatFileSize } from "./utils";
import type { ModelUploadProps } from "./types";
import { ModelViewer } from "@/components/3d/modelViewer";

const ACCEPTED = ".stl";

export function ModelUpload({
  onUploadComplete,
  onUploadError,
  onFileChange,
  onUploadingChange,
  maxFileSizeMB = 200,
  disabled = false,
  className,
  value = null,
}: ModelUploadProps) {
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
    triggerFileSelect,
  } = useFileUpload({
    maxFiles: 1,
    maxFileSizeMB,
    disabled,
    autoUpload: true,
    // Seed with the externally-controlled value so the hook's internal state
    // starts in sync when the form already has a file (e.g. edit flows).
    value: value ? [value] : [],
    onUploadComplete: (file) => {
      onUploadComplete?.(file);
      onFileChange?.(file);
    },
    onUploadError,
    onFilesChange: (files) => {
      onFileChange?.(files[0] ?? null);
    },
    onUploadingChange,
  });

  // Prefer the hook-managed file; fall back to the externally-controlled value.
  const activeFile = uploadedFiles[0] ?? value ?? null;
  const uploading = uploadingFiles[0] ?? null;

  // The URL to pass to ModelViewer: use the object-URL while uploading,
  // or the stored URL once the upload is complete.
  const previewUrl = uploading
    ? null // no preview during upload — show progress instead
    : (activeFile?.url ?? null);

  const hasFile = Boolean(activeFile || uploading);

  const handleClear = () => {
    if (uploading) {
      removeUploadingFile(0);
    } else if (activeFile) {
      removeUploadedFile(0);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone — hidden once a file is present */}
      {!hasFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none",
            isDragging && !disabled
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4">
              <Box className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragging ? "Drop your STL file here" : "Upload a 3D model"}
              </p>
              <p className="text-xs text-muted-foreground">
                STL files only • Max {maxFileSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept={ACCEPTED}
        multiple={false}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Upload-in-progress state */}
      {uploading && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <div className="shrink-0">
            {uploading.status === "uploading" ||
            uploading.status === "pending" ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : uploading.status === "error" ? (
              <AlertCircle className="h-8 w-8 text-destructive" />
            ) : (
              <Box className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {uploading.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(uploading.file.size)}
            </p>
            {uploading.status === "error" && (
              <p className="text-xs text-destructive mt-1">{uploading.error}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Uploaded — show ModelViewer preview + file meta */}
      {activeFile && !uploading && (
        <div className="space-y-2">
          <ModelViewer fileUrl={previewUrl} />

          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
            <Box className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {activeFile.fileName}
              </p>
              {activeFile.fileSize > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(activeFile.fileSize)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={triggerFileSelect}
                disabled={disabled}
                className="h-8 px-2 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
