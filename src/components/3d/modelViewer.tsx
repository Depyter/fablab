import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@/lib/client-only";
import type { ModelFormat } from "./modelScene";

// ---------------------------------------------------------------------------
// Format & Validation Helpers
// ---------------------------------------------------------------------------

export function getModelFormat(
  fileType?: string | null,
  originalName?: string | null,
): ModelFormat | null {
  if (!originalName) return null;
  const parts = originalName.split(".");
  if (parts.length <= 1) return null;
  const ext = parts.pop()?.toLowerCase();
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

const ModelViewerClient = lazy(() => import("./modelViewerClient"));

export default function ModelViewer(
  props: ComponentProps<typeof ModelViewerClient>,
) {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <ModelViewerClient {...props} />
      </Suspense>
    </ClientOnly>
  );
}
