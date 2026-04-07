import {
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Box,
  type LucideIcon,
} from "lucide-react";
import { EXT_MIME } from "@convex/constants";

// ---------------------------------------------------------------------------
// Accept string for the chat file input.
//
// Why both MIME wildcards AND explicit extensions?
// – image/* / video/*  keep the camera/gallery option on mobile (iOS/Android).
// – Non-media extensions (.stl, .pdf, .dxf …) tell iOS Safari that files
//   beyond the media library are expected, which preserves the "Browse" /
//   Files-app button in the action sheet.  Without any non-media extension the
//   sheet collapses to camera + photos only.
// ---------------------------------------------------------------------------

export const CHAT_ACCEPTED_TYPES = "*/*";

// ---------------------------------------------------------------------------
// Resolve the MIME type for a File object.
// Priority: extension map → browser-reported type → generic binary fallback.
// This is the value that should be used for Content-Type headers and stored
// metadata instead of the raw file.type, which is unreliable on Linux.
// ---------------------------------------------------------------------------

export function resolveFileType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? (file.type || "application/octet-stream");
}

// ---------------------------------------------------------------------------
// Image extension set — used for preview detection when file.type is empty.
// ---------------------------------------------------------------------------

const IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "avif",
  "svg",
  "ico",
]);

export function isImageFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return resolveFileType(file).startsWith("image/") || IMAGE_EXTS.has(ext);
}

// ---------------------------------------------------------------------------
// File icon helper — maps a MIME type to a Lucide icon component.
// ---------------------------------------------------------------------------

export const getFileIcon = (type: string): LucideIcon => {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  if (
    type.startsWith("model/") ||
    type === "application/step" ||
    type === "application/vnd.ms-3mfdocument" ||
    type === "image/vnd.dxf" ||
    type === "image/vnd.dwg"
  )
    return Box;
  if (
    type === "application/pdf" ||
    type === "application/postscript" ||
    type === "image/vnd.adobe.photoshop"
  )
    return FileText;
  return File;
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
