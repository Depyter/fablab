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
      // Fallback: open in new tab if fetch fails
      window.open(f.fileUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Dim backdrop — clicking it closes the lightbox */}
        <DialogOverlay
          className="bg-black/80"
          onClick={() => onOpenChange(false)}
        />

        {/* Full-viewport container */}
        <div
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onKeyDown={handleKey}
          tabIndex={-1}
          autoFocus
        >
          <DialogTitle className="sr-only">
            Media {current + 1} of {count}
          </DialogTitle>

          {/* Top bar — close button left */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          {/* Media area — clicking empty space / gutters closes */}
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
                  className="w-full h-full"
                />
              </div>
            ) : f.fileType?.startsWith("video/") ? (
              <video
                key={f.fileUrl}
                src={f.fileUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : f.fileType === "image/svg+xml" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={f.fileUrl}
                src={f.fileUrl}
                alt={`Media ${current + 1} of ${count}`}
                className="rounded-sm max-w-full max-h-full object-contain"
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
                className="rounded-sm"
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

            {/* Prev arrow */}
            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-2 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next arrow */}
            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-2 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom counter + dot-strip — always visible */}
          <div className="flex flex-col items-center gap-1.5 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 tabular-nums select-none">
                {current + 1} / {count}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCurrent();
                }}
                aria-label="Download"
                className="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            {count > 1 && (
              <div className="flex gap-1.5">
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
                      "h-1 rounded-full transition-all duration-200",
                      i === current
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/30 hover:bg-white/60",
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

  // Single media item — full-width thumbnail, click opens lightbox
  if (count === 1) {
    const f = mediaFiles[0];
    const is3D = is3DModel(f.fileType, f.originalName);
    return (
      <>
        <button
          type="button"
          onClick={() => openAt(0)}
          className="mt-1 block w-full text-left focus:outline-none"
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
              className="relative rounded-md overflow-hidden bg-black"
              style={{ maxHeight: "240px" }}
            >
              <video
                src={f.fileUrl}
                className="max-w-full max-h-60 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/50 p-2">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : f.fileType === "image/svg+xml" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.fileUrl}
              alt="SVG attachment"
              className="rounded-md hover:opacity-95 transition-opacity max-w-full max-h-60 object-contain"
            />
          ) : (
            <Image
              src={f.fileUrl}
              alt="Image attachment"
              width={0}
              height={0}
              sizes="(max-width: 1024px) 320px, 448px"
              className="rounded-md hover:opacity-95 transition-opacity"
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

  // Multiple media — 2-column grid, max 4 cells; remainder shown as "+N"
  const visibleFiles = mediaFiles.slice(0, 4);
  const remaining = count - 4;

  return (
    <>
      <div className="mt-1 grid grid-cols-2 gap-0.5 rounded-md overflow-hidden">
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
                "relative overflow-hidden focus:outline-none",
                isFirstOfThree ? "col-span-2" : "",
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
                    className="w-full h-full object-cover"
                  />
                  {!isLastVisible && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full bg-black/50 p-1.5">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : f.fileType === "image/svg+xml" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.fileUrl}
                  alt={`SVG ${i + 1}`}
                  className={cn(
                    "w-full hover:brightness-90 transition-[filter]",
                    isFirstOfThree ? "h-36" : "h-28",
                    "object-contain",
                  )}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.fileUrl}
                  alt={`Image ${i + 1}`}
                  className={cn(
                    "w-full hover:brightness-90 transition-[filter]",
                    isFirstOfThree ? "h-36" : "h-28",
                    "object-cover",
                  )}
                />
              )}

              {/* "+N more" overlay on the last visible cell */}
              {isLastVisible && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
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
