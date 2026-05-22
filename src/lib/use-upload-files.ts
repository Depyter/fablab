"use client";

import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Zero-dependency replacement for @xixixao/uploadstuff/react's useUploadFiles.
//
// Why not the npm package?
//   - v0.0.5 ships with React 18-era type annotations that are incompatible
//     with React 19's refined callback types.
//   - Internally it aggregates progress across concurrent uploads into a
//     single 10%-bucketed average. We want per-file progress.
//   - The shared `fileProgress` ref causes data races when startUpload is
//     called concurrently.
//   - At ~60 lines the entire hook is trivial to inline.
//
// How this version differs from the npm package:
//   - startUpload accepts per-call options (onUploadProgress) instead of
//     hook-level options. This gives accurate per-file progress.
//   - Files are uploaded sequentially in a for-of loop. Each file gets its
//     own short-lived Convex upload URL (no single-use-URL sharing bugs).
//   - Errors REJECT the promise (the npm version silently returns []).
//   - The response type is narrowed to { storageId: string } instead of
//     unknown, matching Convex's POST response shape.
// ---------------------------------------------------------------------------

export interface UploadFileResponse {
  name: string;
  size: number;
  type: string;
  response: { storageId: string };
}

export interface StartUploadOptions {
  /** Fires repeatedly during a single file's upload (0–100). */
  onUploadProgress?: (percent: number) => void;
  /** MIME type to send as the Content-Type header. If omitted, falls back
   * to file.type, then to "application/octet-stream". Always pass the
   * resolved MIME type from resolveFileType() — browser-reported file.type
   * is unreliable (empty on Linux, missing for .stl on Windows). */
  contentType?: string;
}

export function useUploadFiles(generateUploadUrl: () => Promise<string>) {
  const [isUploading, setIsUploading] = useState(false);

  const startUpload = useCallback(
    async (
      files: File[],
      options?: StartUploadOptions,
    ): Promise<UploadFileResponse[]> => {
      setIsUploading(true);
      const results: UploadFileResponse[] = [];

      try {
        for (const file of files) {
          const uploadUrl = await generateUploadUrl();

          const response = await uploadOne(file, uploadUrl, options);
          results.push({
            name: file.name,
            size: file.size,
            type: file.type,
            response,
          });
        }

        return results;
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl],
  );

  return { startUpload, isUploading };
}

// ---------------------------------------------------------------------------
// Internal: upload a single file via XMLHttpRequest so we can tap into
// xhr.upload.onprogress events (the fetch API does not expose upload progress).
// ---------------------------------------------------------------------------

function uploadOne(
  file: File,
  url: string,
  options?: StartUploadOptions,
): Promise<{ storageId: string }> {
  return new Promise<{ storageId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && options?.onUploadProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        options.onUploadProgress(pct);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as unknown;
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "storageId" in parsed &&
            typeof (parsed as Record<string, unknown>).storageId === "string"
          ) {
            resolve(parsed as { storageId: string });
          } else {
            reject(new Error("Upload response missing storageId"));
          }
        } catch {
          reject(new Error("Invalid upload response from server"));
        }
      } else {
        reject(
          new Error(
            `Upload failed with status ${xhr.status}${
              xhr.statusText ? `: ${xhr.statusText}` : ""
            }`,
          ),
        );
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network connection dropped during upload")),
    );

    xhr.addEventListener("abort", () =>
      reject(new Error("Upload was cancelled")),
    );

    xhr.open("POST", url);
    xhr.setRequestHeader(
      "Content-Type",
      options?.contentType || file.type || "application/octet-stream",
    );
    xhr.send(file);
  });
}
