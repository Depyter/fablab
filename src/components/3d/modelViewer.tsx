"use client";

import dynamic from "next/dynamic";
import type { ModelFormat } from "./modelScene";

// ---------------------------------------------------------------------------
// Format & Validation Helpers
// ---------------------------------------------------------------------------

export function getModelFormat(
  fileType?: string | null,
  originalName?: string | null,
): ModelFormat | null {
  const ext = originalName?.split(".").pop()?.toLowerCase();
  if (ext === "stl") return "stl";
  if (ext === "glb" || ext === "gltf") return ext as ModelFormat;
  if (ext === "obj") return "obj";
  return null;
}

export function is3DModel(
  fileType?: string | null,
  originalName?: string | null,
): boolean {
  return getModelFormat(fileType, originalName) !== null;
}

// ---------------------------------------------------------------------------
// Dynamic Import of Client Component
// ---------------------------------------------------------------------------
// By using next/dynamic with ssr: false, we ensure that three.js and
// @react-three/* libraries are NEVER included in the server bundle (Cloudflare Worker).
// They will only be loaded on the client side.

export const ModelViewer = dynamic(() => import("./modelViewerClient"), {
  ssr: false,
});
