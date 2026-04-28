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
    <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
      {attachments.map((attachment, i) => (
        <div
          key={attachment.storageId}
          className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-primary/10 bg-sidebar-accent/50 shadow-sm transition-all hover:border-primary/20"
        >
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${attachment.fileName}`}
            className="absolute top-1 right-1 z-10 rounded-full bg-primary/90 p-1 text-primary-foreground hover:bg-primary transition-all shadow-md active:scale-95"
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
                  ? "object-contain p-2"
                  : "object-cover",
              )}
            />
          ) : attachment.fileType.startsWith("video/") &&
            attachment.previewUrl ? (
            <div className="relative w-full h-full bg-black">
              <video
                src={attachment.previewUrl}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-primary/40 p-1.5 backdrop-blur-sm">
                  <Play className="h-3.5 w-3.5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-muted/30">
              <FileAttachmentThumbnail
                fileName={attachment.fileName}
                fileType={attachment.fileType}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
