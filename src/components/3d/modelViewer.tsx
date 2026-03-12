"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Info, Box, Activity, PhilippinePeso } from "lucide-react";
import type { ModelFormat } from "./modelScene";
import type { ModelData } from "./utils";
import { Button } from "@/components/ui/button";

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
          "mt-2 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-sidebar-border/50 bg-sidebar-accent/20",
          className,
        )}
      >
        <p className="text-muted-foreground font-sans text-sm">
          Upload a 3D model to preview
        </p>
      </div>
    );
  }

  const format = getModelFormat(fileType, originalName);

  return (
    <div
      className={cn(
        "mt-2 w-full overflow-hidden rounded-2xl border border-sidebar-border/50 bg-black relative shadow-inner",
        className,
      )}
    >
      <Canvas shadows camera={{ position: [60, 80, 120], fov: 50 }}>
        <Suspense fallback={null}>
          <ModelScene fileUrl={fileUrl} format={format} onData={setModelData} />
        </Suspense>
      </Canvas>

      {modelData && isInfoVisible && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl text-foreground max-w-[280px] z-10 border border-sidebar-border/50 font-sans">
          <div className="flex justify-between items-center mb-5 border-b border-sidebar-border/30 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-bold text-sm tracking-tight">
                Model Analysis
              </h3>
            </div>
            <button
              onClick={() => setIsInfoVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                <Box className="h-3 w-3" />
                Geometry
              </div>
              <div className="grid grid-cols-1 gap-1.5 pl-5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-semibold">
                    {(modelData.volume / 1000).toFixed(2)} cm³
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Triangles</span>
                  <span className="font-semibold">
                    {modelData.triangleCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Size (XYZ)</span>
                  <span className="font-semibold text-[10px] tabular-nums">
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
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                <Activity className="h-3 w-3" />
                Fabrication
              </div>
              <div className="grid grid-cols-1 gap-1.5 pl-5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-semibold">
                    {modelData.weight.toFixed(2)} g
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-semibold">
                    {modelData.printTime.toFixed(1)} hr
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Complexity</span>
                  <span className="font-semibold text-primary">
                    Tier {modelData.complexityTier}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-1 border-t border-sidebar-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                  <PhilippinePeso className="h-3 w-3" />
                  Price
                </div>
                <span className="text-lg font-black tracking-tighter text-primary">
                  ₱
                  {modelData.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {modelData && !isInfoVisible && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsInfoVisible(true)}
          className="absolute top-4 right-4 bg-background/80 backdrop-blur-md rounded-xl shadow-lg border border-sidebar-border/50 gap-2 font-bold uppercase tracking-widest text-[10px] h-9"
        >
          <Info className="h-3.5 w-3.5" />
          Analytics
        </Button>
      )}
    </div>
  );
}
