import { Image } from "@unpic/react";
import { ChevronLeft, ChevronRight, Download, Play, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { lazy, useState } from "react";
import { is3DModel } from "@/components/3d/utils";
import {
  FileAttachmentCard,
  FileAttachmentThumbnail,
} from "@/components/chat/file-attachment";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const ModelViewer = lazy(() => import("@/components/3d/modelViewer"));

export interface MediaFile {
  fileUrl: string;
  fileType: string | null;
  originalName: string | null;
}

const getMediaFileKey = (file: MediaFile) => file.fileUrl;

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
  mediaFiles: Array<MediaFile>;
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
          <div className="relative flex-1 flex items-center justify-center min-h-0 px-2 sm:px-16">
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => onOpenChange(false)}
              className="absolute inset-0"
            />

            <div className="relative z-10 flex h-full w-full items-center justify-center">
              {is3D ? (
                <div className="h-full w-full sm:w-4/5">
                  <ModelViewer
                    fileUrl={f.fileUrl}
                    fileType={f.fileType}
                    originalName={f.originalName}
                    className="w-full h-full rounded-2xl"
                  />
                </div>
              ) : isDocument ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/5 p-12 text-center">
                  <div className="rounded-full bg-white/5 p-6 text-white/50">
                    <Download className="h-16 w-16" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-xl font-medium text-white/90">
                      {f.originalName || "Document"}
                    </h3>
                    <p className="text-sm text-white/50">
                      Preview not available
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadCurrent}
                    className="mt-4 rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary/90"
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
                  muted
                  playsInline
                  className="max-h-full max-w-full rounded-xl shadow-2xl"
                />
              ) : f.fileType === "image/svg+xml" ? (
                <img
                  key={f.fileUrl}
                  src={f.fileUrl}
                  alt={`Media ${current + 1} of ${count}`}
                  className="max-h-full max-w-full rounded-xl object-contain"
                />
              ) : (
                <img
                  key={f.fileUrl}
                  src={f.fileUrl}
                  alt={`Media ${current + 1} of ${count}`}
                  className="max-h-full max-w-full rounded-xl object-contain"
                />
              )}
            </div>

            {count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-4 z-20 hidden rounded-xl bg-white/5 p-2.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 sm:flex"
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
                className="absolute right-4 z-20 hidden rounded-xl bg-white/5 p-2.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 sm:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center gap-3 py-5 shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile-only prev/next pill */}
              {count > 1 && (
                <div className="flex sm:hidden items-center rounded-full bg-white/5 border border-white/8">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prev();
                    }}
                    aria-label="Previous"
                    className="px-3 py-1.5 text-white/35 hover:text-white/70 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="w-px h-3 bg-white/10" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      next();
                    }}
                    aria-label="Next"
                    className="px-3 py-1.5 text-white/35 hover:text-white/70 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

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
            </div>

            {count > 1 && (
              <div className="flex gap-1.5">
                {mediaFiles.map((mediaFile, i) => (
                  <button
                    key={getMediaFileKey(mediaFile)}
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

export function MediaGallery({ mediaFiles }: { mediaFiles: Array<MediaFile> }) {
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
              className="max-w-md"
            />
          ) : f.fileType?.startsWith("video/") ? (
            <div className="relative rounded-xl overflow-hidden bg-black/10 max-w-md">
              <video
                src={f.fileUrl}
                muted
                playsInline
                className="max-w-full max-h-56 object-cover w-full"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/30 p-2.5 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : f.fileType === "image/svg+xml" ? (
            <img
              src={f.fileUrl}
              alt="SVG attachment"
              className="rounded-xl max-w-full max-h-56 object-contain bg-muted/20 p-3"
            />
          ) : (
            <div className="max-w-md">
              <Image
                src={f.fileUrl}
                alt="Image attachment"
                layout="constrained"
                width={448}
                height={224}
                className="rounded-xl object-cover"
              />
            </div>
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
              key={getMediaFileKey(f)}
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
                    muted
                    playsInline
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
                <img
                  src={f.fileUrl}
                  alt={`SVG ${i + 1}`}
                  className={cn(
                    "w-full object-contain bg-muted/20 p-1.5",
                    isFirstOfThree ? "h-32" : "h-24",
                  )}
                />
              ) : (
                <img
                  src={f.fileUrl}
                  alt={`Attachment ${i + 1}`}
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
