"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import type { ModelFormat } from "./modelScene";
import type { ModelData } from "./utils";

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
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [isInfoVisible, setIsInfoVisible] = useState(true);

  if (!fileUrl) {
    return (
      <div
        className={cn(
          "mt-1 flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50",
          className,
        )}
      >
        <p className="text-gray-400">Upload a 3D model to preview</p>
      </div>
    );
  }

  const format = getModelFormat(fileType, originalName);

  return (
    <div
      className={cn(
        "mt-1 w-full overflow-hidden rounded-md border border-gray-700 bg-gray-900 relative",
        className,
      )}
    >
      <Canvas shadows camera={{ position: [60, 80, 120], fov: 50 }}>
        <Suspense fallback={null}>
          <ModelScene fileUrl={fileUrl} format={format} onData={setModelData} />
        </Suspense>
      </Canvas>

      {modelData && isInfoVisible && (
        <div className="absolute top-4 right-4 bg-secondary p-4 rounded-lg shadow-lg text-black max-w-xs z-10 border border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Model Info</h3>
            <button
              onClick={() => setIsInfoVisible(false)}
              className="text-black hover:text-primary text-sm"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">
                Geometry
              </p>
              <p className="text-sm">
                <strong>Volume:</strong> {(modelData.volume / 1000).toFixed(2)}{" "}
                cm³
              </p>
              <p className="text-sm">
                <strong>Surface Area:</strong>{" "}
                {modelData.surfaceArea.toFixed(2)} mm²
              </p>
              <p className="text-sm">
                <strong>Triangles:</strong>{" "}
                {modelData.triangleCount.toLocaleString()}
              </p>
              <p className="text-sm">
                <strong>Size (mm):</strong>{" "}
                {(
                  modelData.boundingBox.max.x - modelData.boundingBox.min.x
                ).toFixed(1)}{" "}
                ×{" "}
                {(
                  modelData.boundingBox.max.y - modelData.boundingBox.min.y
                ).toFixed(1)}{" "}
                ×{" "}
                {(
                  modelData.boundingBox.max.z - modelData.boundingBox.min.z
                ).toFixed(1)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">
                Print Estimates
              </p>
              <p className="text-sm">
                <strong>Weight:</strong> {modelData.weight.toFixed(2)} g
              </p>
              <p className="text-sm">
                <strong>Print Time:</strong> {modelData.printTime.toFixed(2)} hr
              </p>
              <p className="text-sm">
                <strong>Support:</strong>{" "}
                {modelData.supportRequired ? "Required" : "Not required"}
              </p>
              <p className="text-sm">
                <strong>Overhang Ratio:</strong>{" "}
                {(modelData.overhangRatio * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">
                Pricing
              </p>
              <p className="text-sm">
                <strong>Complexity:</strong> Tier {modelData.complexityTier}
              </p>
              <p className="text-sm">
                <strong>Estimated Price:</strong> ₱{modelData.price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {modelData && !isInfoVisible && (
        <button
          onClick={() => setIsInfoVisible(true)}
          className="absolute top-4 right-4 bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-secondary z-10"
        >
          Show Info
        </button>
      )}
    </div>
  );
}
