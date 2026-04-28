"use client";

import { is3DModel } from "@/components/3d/modelViewer";
import { MediaGallery, type MediaFile } from "@/components/chat/media-gallery";
import { FileAttachmentCard } from "@/components/chat/file-attachment";
import { MessageFile } from "../types";

// ---------------------------------------------------------------------------
// FileGallery — gallery for generic file attachments (PDF, docs, etc.)
// ---------------------------------------------------------------------------

function FileGallery({ files }: { files: MessageFile[] }) {
  if (files.length === 0) return null;

  const renderFileCard = (f: MessageFile, isStacked = false) => {
    const fileName =
      f.originalName ||
      (f.fileUrl
        ? decodeURIComponent(f.fileUrl.split("/").pop()?.split("?")[0] ?? "")
        : "") ||
      "attachment";

    if (!f.fileUrl) return null;

    return (
      <FileAttachmentCard
        href={f.fileUrl}
        fileName={fileName}
        fileType={f.fileType}
        className={isStacked ? "" : "mt-1"}
      />
    );
  };

  if (files.length === 1) {
    return renderFileCard(files[0]);
  }

  // Multiple files — vertical stack of cards
  return (
    <div className="mt-1 space-y-1">
      {files.map((f) => (
        <div key={f.fileUrl}>{renderFileCard(f, true)}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageAttachments — top-level renderer for a message's file array
// ---------------------------------------------------------------------------

export function MessageAttachments({ files }: { files: MessageFile[] }) {
  const mediaFiles: MediaFile[] = files
    .filter(
      (f) =>
        !!f.fileUrl &&
        (f.fileType?.startsWith("image/") ||
          f.fileType?.startsWith("video/") ||
          is3DModel(f.fileType, f.originalName)),
    )
    .map((f) => ({
      fileUrl: f.fileUrl!,
      fileType: f.fileType,
      originalName: f.originalName,
    }));

  const genericFiles = files.filter((f) => {
    if (!f.fileUrl) return false;
    // If it's in mediaFiles, don't put it in genericFiles
    const isMedia =
      f.fileType?.startsWith("image/") ||
      f.fileType?.startsWith("video/") ||
      is3DModel(f.fileType, f.originalName);
    return !isMedia;
  });

  return (
    <div className="space-y-1">
      {mediaFiles.length > 0 && <MediaGallery mediaFiles={mediaFiles} />}
      <FileGallery files={genericFiles} />
    </div>
  );
}
