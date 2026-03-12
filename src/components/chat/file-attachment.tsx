"use client";

import {
  FileIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  Code,
  FileImage,
  FileVideo,
  Box,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileInfo {
  Icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  label: string;
}

// ---------------------------------------------------------------------------
// getFileInfo — maps a file name / MIME type to icon + color metadata
// ---------------------------------------------------------------------------

export function getFileInfo(
  fileName: string | null,
  fileType: string | null,
): FileInfo {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const mime = fileType?.toLowerCase() ?? "";

  // 3-D models
  if (
    ["stl", "obj", "glb", "gltf", "3mf"].includes(ext) ||
    mime.startsWith("model/")
  )
    return {
      Icon: Box,
      colorClass: "text-cyan-500",
      bgClass: "bg-cyan-500/10",
      label: ext.toUpperCase() || "3D",
    };

  // PDF
  if (ext === "pdf" || mime === "application/pdf")
    return {
      Icon: FileText,
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10",
      label: "PDF",
    };

  // Word
  if (["doc", "docx"].includes(ext) || mime.includes("word"))
    return {
      Icon: FileText,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10",
      label: ext.toUpperCase() || "DOC",
    };

  // Excel / CSV
  if (
    ["xls", "xlsx", "csv"].includes(ext) ||
    mime.includes("spreadsheet") ||
    mime.includes("excel")
  )
    return {
      Icon: FileSpreadsheet,
      colorClass: "text-green-500",
      bgClass: "bg-green-500/10",
      label: ext.toUpperCase() || "XLS",
    };

  // PowerPoint
  if (
    ["ppt", "pptx"].includes(ext) ||
    mime.includes("presentation") ||
    mime.includes("powerpoint")
  )
    return {
      Icon: Presentation,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-500/10",
      label: ext.toUpperCase() || "PPT",
    };

  // Archives
  if (
    ["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("archive")
  )
    return {
      Icon: FileArchive,
      colorClass: "text-yellow-500",
      bgClass: "bg-yellow-500/10",
      label: ext.toUpperCase() || "ZIP",
    };

  // Code / text
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "rs",
      "go",
      "rb",
      "php",
      "html",
      "css",
      "json",
      "xml",
      "yaml",
      "yml",
      "sh",
    ].includes(ext)
  )
    return {
      Icon: Code,
      colorClass: "text-purple-500",
      bgClass: "bg-purple-500/10",
      label: ext.toUpperCase(),
    };

  // Image fallback
  if (mime.startsWith("image/"))
    return {
      Icon: FileImage,
      colorClass: "text-pink-500",
      bgClass: "bg-pink-500/10",
      label: ext.toUpperCase() || "IMG",
    };

  // Video fallback
  if (mime.startsWith("video/"))
    return {
      Icon: FileVideo,
      colorClass: "text-violet-500",
      bgClass: "bg-violet-500/10",
      label: ext.toUpperCase() || "VID",
    };

  return {
    Icon: FileIcon,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
    label: ext.toUpperCase() || "FILE",
  };
}

// ---------------------------------------------------------------------------
// FileAttachmentCard — horizontal card used for file attachments and 3D model
// single-item view. Renders as an <a> when `href` is provided, or a <div>
// when used as a clickable button wrapper (e.g. inside a <button>).
// ---------------------------------------------------------------------------

interface FileAttachmentCardProps {
  fileName: string;
  fileType: string | null;
  isCurrentUser: boolean;
  /** When provided the card is rendered as a plain anchor tag. */
  href?: string;
  className?: string;
}

export function FileAttachmentCard({
  fileName,
  fileType,
  isCurrentUser,
  href,
  className,
}: FileAttachmentCardProps) {
  const { Icon, colorClass, bgClass, label } = getFileInfo(fileName, fileType);

  const inner = (
    <>
      <div
        className={cn(
          "shrink-0 rounded-md p-2",
          isCurrentUser ? "bg-primary-foreground/15" : bgClass,
        )}
      >
        <Icon
          className={cn(
            "h-7 w-7",
            isCurrentUser ? "text-primary-foreground" : colorClass,
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate leading-tight">{fileName}</p>
        <p
          className={cn(
            "text-xs mt-0.5 uppercase",
            isCurrentUser
              ? "text-primary-foreground/60"
              : "text-muted-foreground",
          )}
        >
          {label}
        </p>
      </div>
    </>
  );

  const sharedClassName = cn(
    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-opacity hover:opacity-80",
    isCurrentUser
      ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
      : "border-border bg-muted/40 text-foreground",
    className,
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClassName}
      >
        {inner}
      </a>
    );
  }

  return <div className={sharedClassName}>{inner}</div>;
}

// ---------------------------------------------------------------------------
// FileAttachmentThumbnail — compact square thumbnail used inside the media
// grid for 3D models (and potentially other non-visual file types).
// ---------------------------------------------------------------------------

interface FileAttachmentThumbnailProps {
  fileName: string;
  fileType: string | null;
  isCurrentUser: boolean;
  className?: string;
}

export function FileAttachmentThumbnail({
  fileName,
  fileType,
  isCurrentUser,
  className,
}: FileAttachmentThumbnailProps) {
  const { Icon, colorClass, bgClass, label } = getFileInfo(fileName, fileType);

  return (
    <div
      className={cn(
        "w-full h-full border flex flex-col items-center justify-center p-2 text-center transition-colors hover:bg-muted/80",
        isCurrentUser
          ? "bg-primary-foreground/10 text-primary-foreground"
          : "bg-muted text-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-md p-1.5 mb-1",
          isCurrentUser ? "bg-primary-foreground/15" : bgClass,
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            isCurrentUser ? "text-primary-foreground" : colorClass,
          )}
        />
      </div>
      <p className="text-xs font-medium truncate w-full leading-tight">
        {fileName}
      </p>
      <p
        className={cn(
          "text-xs mt-0.5 uppercase",
          isCurrentUser
            ? "text-primary-foreground/60"
            : "text-muted-foreground",
        )}
      >
        {label}
      </p>
    </div>
  );
}
