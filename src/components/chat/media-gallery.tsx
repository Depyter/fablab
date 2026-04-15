"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Play, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
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
  const isMediaFile =
    f.fileType?.startsWith("image/") || f.fileType?.startsWith("video/");
  const isDocument = !isMediaFile && !is3D;

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
          className="bg-black/90 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />

        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onKeyDown={handleKey}
          tabIndex={-1}
          autoFocus
        >
          <DialogTitle className="sr-only">
            Media {current + 1} of {count}
          </DialogTitle>

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-xl p-2 text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>

            <div className="flex flex-col items-end gap-0.5">
              {f.originalName && (
                <span className="text-sm font-semibold text-white/80 truncate max-w-xs">
                  {f.originalName}
                </span>
              )}
              {f.fileType && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {f.fileType.split("/").pop()}
                </span>
              )}
            </div>
          </div>

          {/* Media area */}
          <div
            className="relative flex-1 flex items-center justify-center min-h-0 px-16 cursor-default"
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
            ) : isDocument ? (
              <div
                className="flex flex-col items-center justify-center gap-4 bg-white/5 rounded-2xl p-12 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-white/50 bg-white/5 p-6 rounded-full">
                  <Download className="w-16 h-16" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white/90 mb-1">
                    {f.originalName || "Document"}
                  </h3>
                  <p className="text-white/50 text-sm">Preview not available</p>
                </div>
                <button
                  onClick={downloadCurrent}
                  className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
                >
                  Download File
                </button>
              </div>
            ) : f.fileType?.startsWith("video/") ? (
              <video
                key={f.fileUrl}
                src={f.fileUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : f.fileType === "image/svg+xml" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={f.fileUrl}
                src={f.fileUrl}
                alt={`Media ${current + 1} of ${count}`}
                className="rounded-xl max-w-full max-h-full object-contain"
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
                className="rounded-xl"
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
                className="absolute left-4 rounded-xl p-2.5 bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
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
                className="absolute right-4 rounded-xl p-2.5 bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center gap-3 py-5 shrink-0">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/8">
              {count > 1 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/35 tabular-nums select-none">
                  {current + 1} / {count}
                </span>
              )}
              {count > 1 && <div className="w-px h-3 bg-white/10" />}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCurrent();
                }}
                aria-label="Download"
                className="text-white/35 hover:text-white/70 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
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
                      "h-1 rounded-full transition-all duration-300",
                      i === current
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-white/20 hover:bg-white/35",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
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

  // ── Single file ────────────────────────────────────────────────────────────
  if (count === 1) {
    const f = mediaFiles[0];
    const is3D = is3DModel(f.fileType, f.originalName);
    const isMediaFile =
      f.fileType?.startsWith("image/") || f.fileType?.startsWith("video/");
    const isDocument = !isMediaFile && !is3D;

    return (
      <>
        <button
          type="button"
          onClick={() => openAt(0)}
          className="mt-1.5 block w-full text-left focus:outline-none"
        >
          {is3D || isDocument ? (
            <FileAttachmentCard
              fileName={f.originalName || "File"}
              fileType={f.fileType}
              isCurrentUser={isCurrentUser}
            />
          ) : f.fileType?.startsWith("video/") ? (
            <div className="relative rounded-xl overflow-hidden bg-black/10">
              <video
                src={f.fileUrl}
                className="max-w-full max-h-56 object-cover w-full"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/30 p-2.5 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : f.fileType === "image/svg+xml" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={f.fileUrl}
              alt="SVG attachment"
              className="rounded-xl max-w-full max-h-56 object-contain bg-muted/20 p-3"
            />
          ) : (
            <Image
              src={f.fileUrl}
              alt="Image attachment"
              width={0}
              height={0}
              sizes="(max-width: 1024px) 320px, 448px"
              className="rounded-xl"
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "100%",
                maxHeight: "224px",
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

  // ── Multiple files ──────────────────────────────────────────────────────────
  const visibleFiles = mediaFiles.slice(0, 4);
  const remaining = count - 4;

  return (
    <>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        {visibleFiles.map((f, i) => {
          const isFirstOfThree = count === 3 && i === 0;
          const isLastVisible = i === visibleFiles.length - 1 && remaining > 0;
          const is3D = is3DModel(f.fileType, f.originalName);
          const isMediaFile =
            f.fileType?.startsWith("image/") ||
            f.fileType?.startsWith("video/");
          const isDocument = !isMediaFile && !is3D;

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
              {is3D || isDocument ? (
                <FileAttachmentThumbnail
                  fileName={f.originalName || "File"}
                  fileType={f.fileType}
                  isCurrentUser={isCurrentUser}
                  className={isFirstOfThree ? "h-32" : "h-24"}
                />
              ) : f.fileType?.startsWith("video/") ? (
                <div
                  className={cn(
                    "relative w-full bg-black/10",
                    isFirstOfThree ? "h-32" : "h-24",
                  )}
                >
                  <video
                    src={f.fileUrl}
                    className="w-full h-full object-cover opacity-75"
                  />
                  {!isLastVisible && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full bg-black/25 p-1.5 backdrop-blur-sm">
                        <Play className="h-3.5 w-3.5 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : f.fileType === "image/svg+xml" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={f.fileUrl}
                  alt={`SVG ${i + 1}`}
                  className={cn(
                    "w-full object-contain bg-muted/20 p-1.5",
                    isFirstOfThree ? "h-32" : "h-24",
                  )}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={f.fileUrl}
                  alt={`Image ${i + 1}`}
                  className={cn(
                    "w-full object-cover",
                    isFirstOfThree ? "h-32" : "h-24",
                  )}
                />
              )}

              {/* "+N more" overlay */}
              {isLastVisible && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="text-white/90 font-bold text-xl tracking-tight tabular-nums">
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
