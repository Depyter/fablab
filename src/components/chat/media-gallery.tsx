"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Play, ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ModelViewer, is3DModel } from "@/components/3d/modelViewer";
import {
  FileAttachmentCard,
  FileAttachmentThumbnail,
} from "@/components/chat/file-attachment";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaFile {
  fileUrl: string;
  fileType: string | null;
  originalName: string | null;
}

// ---------------------------------------------------------------------------
// MediaLightbox — full-screen dialog viewer with prev/next navigation
// ---------------------------------------------------------------------------

function MediaLightbox({
  mediaFiles,
  current,
  setCurrent,
  open,
  onOpenChange,
}: {
  mediaFiles: MediaFile[];
  current: number;
  setCurrent: React.Dispatch<React.SetStateAction<number>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const count = mediaFiles.length;
  const f = mediaFiles[current];
  if (!f) return null;

  const prev = () => setCurrent((c) => (c - 1 + count) % count);
  const next = () => setCurrent((c) => (c + 1) % count);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") onOpenChange(false);
  };

  const is3D = is3DModel(f.fileType, f.originalName);

  const downloadCurrent = async () => {
    try {
      const response = await fetch(f.fileUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = f.originalName || "download";
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(f.fileUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          className="bg-black/95 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />

        <div
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onKeyDown={handleKey}
          tabIndex={-1}
          autoFocus
        >
          <DialogTitle className="sr-only">
            Media {current + 1} of {count}
          </DialogTitle>

          <div className="flex items-center justify-between px-6 py-4 shrink-0">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-xl p-2 text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </DialogClose>
            <div className="flex flex-col items-end gap-0.5">
              {f.originalName && (
                <span className="text-sm font-medium text-white/90 truncate max-w-xs">
                  {f.originalName}
                </span>
              )}
              {f.fileType && (
                <span className="text-xs text-white/40 uppercase tracking-widest">
                  {f.fileType.split("/").pop()}
                </span>
              )}
            </div>
          </div>

          <div
            className="relative flex-1 flex items-center justify-center min-h-0 px-12 cursor-default"
            onClick={() => onOpenChange(false)}
          >
            {is3D ? (
              <div
                className="h-full w-4/5"
                onClick={(e) => e.stopPropagation()}
              >
                <ModelViewer
                  fileUrl={f.fileUrl}
                  fileType={f.fileType}
                  originalName={f.originalName}
                  className="w-full h-full rounded-2xl"
                />
              </div>
            ) : f.fileType?.startsWith("video/") ? (
              <video
                key={f.fileUrl}
                src={f.fileUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : f.fileType === "image/svg+xml" ? (
              <img
                key={f.fileUrl}
                src={f.fileUrl}
                alt={`Media ${current + 1} of ${count}`}
                className="rounded-2xl max-w-full max-h-full object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Image
                key={f.fileUrl}
                src={f.fileUrl}
                alt={`Media ${current + 1} of ${count}`}
                width={0}
                height={0}
                sizes="100vw"
                className="rounded-2xl shadow-2xl"
                style={{
                  width: "auto",
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "cover",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-6 rounded-xl p-3 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-6 rounded-xl p-3 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 py-6 shrink-0">
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <span className="text-xs font-bold text-white/60 tabular-nums select-none tracking-widest uppercase">
                {current + 1} / {count}
              </span>
              <div className="w-px h-3 bg-white/10" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCurrent();
                }}
                aria-label="Download"
                className="text-white/50 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            {count > 1 && (
              <div className="flex gap-2">
                {mediaFiles.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrent(i);
                    }}
                    aria-label={`Go to ${i + 1}`}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      i === current
                        ? "w-8 bg-primary"
                        : "w-2 bg-white/20 hover:bg-white/40",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MediaGallery — renders 1-N image/video thumbnails with lightbox on click
// ---------------------------------------------------------------------------

export function MediaGallery({
  mediaFiles,
  isCurrentUser,
}: {
  mediaFiles: MediaFile[];
  isCurrentUser: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxCurrent, setLightboxCurrent] = useState(0);

  const openAt = (index: number) => {
    setLightboxCurrent(index);
    setLightboxOpen(true);
  };

  const count = mediaFiles.length;
  if (count === 0) return null;

  if (count === 1) {
    const f = mediaFiles[0];
    const is3D = is3DModel(f.fileType, f.originalName);
    return (
      <>
        <button
          type="button"
          onClick={() => openAt(0)}
          className="mt-2 block w-full text-left focus:outline-none"
        >
          {is3D ? (
            <FileAttachmentCard
              fileName={f.originalName || "Model"}
              fileType={f.fileType}
              isCurrentUser={isCurrentUser}
              className="mt-1"
            />
          ) : f.fileType?.startsWith("video/") ? (
            <div
              className="relative rounded-xl overflow-hidden bg-sidebar-accent/50 border border-sidebar-border/50"
              style={{ maxHeight: "240px" }}
            >
              <video
                src={f.fileUrl}
                className="max-w-full max-h-60 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-primary/40 p-2.5 backdrop-blur-sm">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : f.fileType === "image/svg+xml" ? (
            <img
              src={f.fileUrl}
              alt="SVG attachment"
              className="rounded-xl border border-sidebar-border/50 max-w-full max-h-60 object-contain bg-sidebar-accent/30 p-4"
            />
          ) : (
            <Image
              src={f.fileUrl}
              alt="Image attachment"
              width={0}
              height={0}
              sizes="(max-width: 1024px) 320px, 448px"
              className="rounded-xl border border-sidebar-border/50"
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "100%",
                maxHeight: "240px",
                objectFit: "cover",
              }}
            />
          )}
        </button>

        <MediaLightbox
          mediaFiles={mediaFiles}
          current={lightboxCurrent}
          setCurrent={setLightboxCurrent}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      </>
    );
  }

  const visibleFiles = mediaFiles.slice(0, 4);
  const remaining = count - 4;

  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
        {visibleFiles.map((f, i) => {
          const isFirstOfThree = count === 3 && i === 0;
          const isLastVisible = i === visibleFiles.length - 1 && remaining > 0;
          const is3D = is3DModel(f.fileType, f.originalName);

          return (
            <button
              key={i}
              type="button"
              onClick={() => openAt(i)}
              className={cn(
                "relative overflow-hidden focus:outline-none bg-sidebar-accent/30 border border-sidebar-border/50",
                isFirstOfThree ? "col-span-2" : "",
                "rounded-lg",
              )}
            >
              {is3D ? (
                <FileAttachmentThumbnail
                  fileName={f.originalName || "Model"}
                  fileType={f.fileType}
                  isCurrentUser={isCurrentUser}
                  className="h-28"
                />
              ) : f.fileType?.startsWith("video/") ? (
                <div className="relative w-full h-28 bg-black">
                  <video
                    src={f.fileUrl}
                    className="w-full h-full object-cover opacity-80"
                  />
                  {!isLastVisible && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full bg-primary/40 p-1.5 backdrop-blur-sm">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : f.fileType === "image/svg+xml" ? (
                <img
                  src={f.fileUrl}
                  alt={`SVG ${i + 1}`}
                  className={cn(
                    "w-full",
                    isFirstOfThree ? "h-36" : "h-28",
                    "object-contain p-2",
                  )}
                />
              ) : (
                <img
                  src={f.fileUrl}
                  alt={`Image ${i + 1}`}
                  className={cn(
                    "w-full",
                    isFirstOfThree ? "h-36" : "h-28",
                    "object-cover",
                  )}
                />
              )}

              {isLastVisible && (
                <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-primary-foreground font-black text-2xl tracking-tighter">
                    +{remaining + 1}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <MediaLightbox
        mediaFiles={mediaFiles}
        current={lightboxCurrent}
        setCurrent={setLightboxCurrent}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}
