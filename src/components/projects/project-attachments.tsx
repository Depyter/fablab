"use client";

import { MediaGallery, type MediaFile } from "@/components/chat/media-gallery";
import { FileAttachmentCard } from "@/components/chat/file-attachment";
import { is3DModel } from "@/components/3d/modelViewer";

export interface AttachmentFile {
  url: string;
  type?: string | null;
  originalName?: string | null;
}

interface ProjectAttachmentsProps {
  files: AttachmentFile[];
}

/**
 * Renders a file list for project/booking details:
 * - Images, video, and 3D models → MediaGallery
 * - All other files → generic file cards
 */
export function ProjectAttachments({ files }: ProjectAttachmentsProps) {
  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground">No files uploaded.</p>;
  }

  const mediaFiles: MediaFile[] = files
    .filter(
      (f) =>
        f.type?.startsWith("image/") ||
        f.type?.startsWith("video/") ||
        is3DModel(f.type, f.originalName),
    )
    .map((f) => ({
      fileUrl: f.url,
      fileType: f.type ?? null,
      originalName: f.originalName ?? null,
    }));

  const docFiles = files.filter(
    (f) =>
      !f.type?.startsWith("image/") &&
      !f.type?.startsWith("video/") &&
      !is3DModel(f.type, f.originalName),
  );

  return (
    <div className="space-y-3">
      {mediaFiles.length > 0 && <MediaGallery mediaFiles={mediaFiles} />}
      {docFiles.length > 0 && (
        <div className="space-y-1">
          {docFiles.map((f) => {
            const name =
              f.originalName ||
              decodeURIComponent(f.url.split("/").pop()?.split("?")[0] ?? "") ||
              "attachment";
            return (
              <FileAttachmentCard
                key={f.url}
                href={f.url}
                fileName={name}
                fileType={f.type ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
