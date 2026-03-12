"use client";

import { X, Play } from "lucide-react";
import { FileAttachmentThumbnail } from "@/components/chat/file-attachment";
import { cn } from "@/lib/utils";
import { PendingAttachment } from "../types";

// ---------------------------------------------------------------------------
// PendingAttachmentStrip — thumbnail strip shown above the input
// ---------------------------------------------------------------------------

interface PendingAttachmentStripProps {
  attachments: PendingAttachment[];
  onRemove: (index: number) => void;
}

export function PendingAttachmentStrip({
  attachments,
  onRemove,
}: PendingAttachmentStripProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
      {attachments.map((attachment, i) => (
        <div
          key={`${attachment.storageId}-${i}`}
          className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border bg-muted"
        >
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${attachment.fileName}`}
            className="absolute top-0.5 right-0.5 z-10 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>

          {attachment.fileType.startsWith("image/") && attachment.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.previewUrl}
              alt={attachment.fileName}
              className={cn(
                "w-full h-full",
                attachment.fileType === "image/svg+xml"
                  ? "object-contain"
                  : "object-cover",
              )}
            />
          ) : attachment.fileType.startsWith("video/") &&
            attachment.previewUrl ? (
            <div className="relative w-full h-full bg-black">
              <video
                src={attachment.previewUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/50 p-1">
                  <Play className="h-3.5 w-3.5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <FileAttachmentThumbnail
              fileName={attachment.fileName}
              fileType={attachment.fileType}
              isCurrentUser={false}
            />
          )}
        </div>
      ))}
    </div>
  );
}
