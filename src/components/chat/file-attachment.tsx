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
  Download,
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
// FileAttachmentCard — following Shadcn UI Kit Chat styles
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
          "shrink-0 rounded-lg p-2.5 flex items-center justify-center transition-colors",
          isCurrentUser ? "bg-white/10" : bgClass,
        )}
      >
        <Icon
          className={cn("h-5 w-5", isCurrentUser ? "text-white" : colorClass)}
        />
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="text-sm font-bold truncate leading-tight mb-0.5">
          {fileName}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-widest opacity-60",
              isCurrentUser ? "text-white/80" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          <div
            className={cn(
              "h-1 w-1 rounded-full opacity-30",
              isCurrentUser ? "bg-white" : "bg-black",
            )}
          />
          <span
            className={cn(
              "text-[10px] font-bold opacity-40",
              isCurrentUser ? "text-white" : "text-black",
            )}
          >
            ATTACHMENT
          </span>
        </div>
      </div>
      {href && (
        <div className="shrink-0 pl-2">
          <div
            className={cn(
              "p-2 rounded-full transition-colors",
              isCurrentUser ? "hover:bg-white/10" : "hover:bg-black/5",
            )}
          >
            <Download
              className={cn(
                "h-4 w-4 opacity-50",
                isCurrentUser ? "text-white" : "text-muted-foreground",
              )}
            />
          </div>
        </div>
      )}
    </>
  );

  const sharedClassName = cn(
    "group flex items-center gap-4 rounded-2xl border px-3 py-2.5 transition-all duration-200",
    isCurrentUser
      ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
      : "border-border/50 bg-secondary/50 text-foreground hover:bg-secondary/80",
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
// FileAttachmentThumbnail — compact version used for non-media grid items
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
        "w-full h-full border-0 flex flex-col items-center justify-center p-3 text-center transition-all duration-200",
        isCurrentUser
          ? "bg-white/5 text-white hover:bg-white/10"
          : "bg-muted/50 text-foreground hover:bg-muted/80",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-xl p-2.5 mb-2 shadow-sm",
          isCurrentUser ? "bg-white/10" : bgClass,
        )}
      >
        <Icon
          className={cn("h-6 w-6", isCurrentUser ? "text-white" : colorClass)}
        />
      </div>
      <div className="w-full space-y-0.5">
        <p className="text-xs font-bold truncate leading-tight w-full px-1">
          {fileName}
        </p>
        <p
          className={cn(
            "text-[9px] font-black uppercase tracking-widest opacity-40",
            isCurrentUser ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
