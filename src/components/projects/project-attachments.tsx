"use client";

import { MediaGallery, type MediaFile } from "@/components/chat/media-gallery";
import { getFileInfo } from "@/components/chat/file-attachment";
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
 * - All other files → inline pill chips
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
      {mediaFiles.length > 0 && (
        <MediaGallery mediaFiles={mediaFiles} isCurrentUser={false} />
      )}
      {docFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docFiles.map((f) => {
            const name =
              f.originalName ||
              decodeURIComponent(f.url.split("/").pop()?.split("?")[0] ?? "") ||
              "attachment";
            const { Icon } = getFileInfo(name, f.type ?? null);
            return (
              <a
                key={f.url}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-[5px] text-[11px] rounded-[6px] px-[9px] py-[4px] border transition-opacity hover:opacity-70"
                style={{
                  background: "var(--fab-bg-sidebar)",
                  borderColor: "var(--fab-border-md)",
                }}
              >
                <Icon
                  style={{ width: 12, height: 12, flexShrink: 0 }}
                  className="text-muted-foreground"
                />
                <span className="truncate max-w-[180px]">{name}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
