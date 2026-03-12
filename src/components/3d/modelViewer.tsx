"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import type { ModelFormat } from "./modelScene";

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

const STL_EXTS = new Set(["stl"]);
const GLTF_EXTS = new Set(["glb", "gltf"]);
const OBJ_EXTS = new Set(["obj"]);

const MIME_FORMAT_MAP: Record<string, ModelFormat> = {
  "model/stl": "stl",
  "application/sla": "stl",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "model/obj": "obj",
};

export function getModelFormat(
  fileType?: string | null,
  originalName?: string | null,
): ModelFormat | null {
  const ext = originalName?.split(".").pop()?.toLowerCase();

  if (ext) {
    if (STL_EXTS.has(ext)) return "stl";
    if (GLTF_EXTS.has(ext)) return ext === "glb" ? "glb" : "gltf";
    if (OBJ_EXTS.has(ext)) return "obj";
  }

  const mime = fileType?.toLowerCase();
  if (mime && mime in MIME_FORMAT_MAP) {
    return MIME_FORMAT_MAP[mime];
  }

  return null;
}

/** Returns true when the file is a 3-D model this viewer can render. */
export function is3DModel(
  fileType?: string | null,
  originalName?: string | null,
): boolean {
  return getModelFormat(fileType, originalName) !== null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ModelScene = dynamic(() => import("./modelScene"), { ssr: false });

interface ModelViewerProps {
  fileUrl: string | null;
  fileType?: string | null;
  originalName?: string | null;
  className?: string;
}

export function ModelViewer({
  fileUrl,
  fileType,
  originalName,
  className,
}: ModelViewerProps) {
  if (!fileUrl) {
    return (
      <div
        className={cn(
          "mt-1 flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50",
          className,
        )}
      >
        <p className="text-gray-500">
          Upload an STL file to preview your model
        </p>
      </div>
    );
  }

  const format = getModelFormat(fileType, originalName);

  return (
    <div
      className={cn(
        "mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-zinc-900",
        className,
      )}
    >
      <Canvas shadows camera={{ position: [60, 80, 120], fov: 50 }}>
        <Suspense fallback={null}>
          <ModelScene fileUrl={fileUrl} format={format} />
        </Suspense>
      </Canvas>
    </div>
  );
}
